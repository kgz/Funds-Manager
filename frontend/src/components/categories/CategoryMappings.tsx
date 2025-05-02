import React, { useState, useEffect, useCallback, FormEvent, useMemo } from 'react'; // Added useMemo
import { Plus, Edit2, Trash2, Loader2, AlertCircle, ListFilter, Tag, Regex, X } from 'lucide-react'; // Added X for modal close
import { cn } from '@/lib/utils/cn';
import { useParams } from 'react-router-dom'; // Assuming react-router-dom
import { createRegExp } from 'magic-regexp'; // Keep for submit validation robustness
import regexpTree from 'regexp-tree'; // Import regexp-tree
import { useAppDispatch, useAppSelector } from '@/store/store';
import { getAllCategories } from '@/store/thunks/category.get.all';
import { getMappings } from '@/store/thunks/mapping.get.all';
import type { CategoryMapping, CategoryMappingsMatch } from '@/store/slices/mappingSlice';
import { createMapping, type CreateMappingPayload } from '@/store/thunks/mapping.create.single';
import { editMapping } from '@/store/thunks/mapping.update.single';
import { deleteMapping } from '@/store/thunks/mapping.delete.single';


// --- Component ---
export const CategoryMappings: React.FC = () => {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Add/Edit Modal State
    type MappingModalMode = 'addMapping' | 'editMapping';
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState<MappingModalMode>('addMapping');
    const [currentMapping, setCurrentMapping] = useState<CategoryMapping | null>(null);
    const [formState, setFormState] = useState<Partial<CategoryMapping>>({ pattern: '', match_type: 'Exact', priority: 10 });
    const [modalError, setModalError] = useState<string | null>(null);
    const [patternError, setPatternError] = useState<string | null>(null); // State for on-blur pattern validation
    const [patternExplanation, setPatternExplanation] = useState<string | null>(null); // State for regex explanation
    const [isSubmitting, setIsSubmitting] = useState(false); // Moved here, applies to both modals

    // Delete Modal State
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [mappingToDelete, setMappingToDelete] = useState<CategoryMapping | null>(null);
    const [deleteError, setDeleteError] = useState<string | null>(null);

    const { id: categoryId } = useParams<{ id: string }>(); // Get categoryId from route params
    // Use the categories from the Redux store (fetched by the parent CategoriesPage or similar)
	const dispatch = useAppDispatch()
    const { categories, categoriesLoading } = useAppSelector(state => state.CategoryReducer);
    const { mappings: temp_mappings } = useAppSelector(state => state.MappingReducer);
	

    // Find the current category name using the store data
    const currentCategoryName = useMemo(() => {
        if (!categoryId || categoriesLoading || categories.length === 0) return null;
        return categories.find(cat => String(cat.id) === String(categoryId))?.name;
    }, [categoryId, categories, categoriesLoading]);

	const mappings = useMemo(()=> {
		return [...temp_mappings].sort((a, b) => a.priority - b.priority).filter(a=>a.category_id === Number(categoryId))
	}, [temp_mappings])
    

    // Fetch mappings when categoryId changes (on route load/change)
    useEffect(() => {
        void dispatch(getMappings())
    }, []);

	useEffect(()=>{
		void dispatch(getAllCategories())
	}, [])

    // --- Modal Handlers ---
    const openModal = (mode: MappingModalMode, mapping?: CategoryMapping) => {
        setModalMode(mode);
        setCurrentMapping(mapping || null);
        setFormState(
            mode === 'editMapping' && mapping
                ? { pattern: mapping.pattern, match_type: mapping.match_type, priority: mapping.priority }
                : { pattern: '', match_type: 'Exact', priority: 10 } // Defaults for add
        );
        setModalError(null);
        setPatternError(null); // Clear pattern error when opening modal
        setPatternExplanation(null); // Clear explanation when opening modal
        setIsModalOpen(true);
    };

    const closeModal = () => {
        if (isSubmitting) return;
        setIsModalOpen(false);
        setCurrentMapping(null);
        setFormState({ pattern: '', match_type: 'Exact', priority: 10 });
        setModalError(null);
        setPatternError(null); // Clear pattern error on close
        setPatternExplanation(null); // Clear explanation on close
    };

    // --- On-Blur Pattern Validation/Explanation using regexp-tree ---
    const handlePatternBlur = () => {
        if (formState.match_type === 'Regex' && formState.pattern?.trim()) {
            try {
                const ast = regexpTree.parse(`/${formState.pattern}/`); // Need to wrap in slashes for parser
                // Basic validation success message
                setPatternExplanation(`Valid Regex syntax. Type: ${ast.type}`); // Example: Show AST root type
                setPatternError(null);
                // TODO: Could potentially traverse the AST here for a more detailed explanation
                // console.log('Regex AST:', ast);
            } catch (regexError) {
                console.error("Invalid Regex Pattern (onBlur):", regexError);
                const errorMsg = `Invalid Regex: ${regexError instanceof Error ? regexError.message : 'Syntax error'}`;
                setPatternError(errorMsg);
                setPatternExplanation(null);
            }
        } else {
            // Clear errors/explanations if not regex or empty
            setPatternError(null);
            setPatternExplanation(null);
        }
    };
    // --- End On-Blur Handler ---

    const handleModalSubmit = async (event: FormEvent) => {
        event.preventDefault();
        if (!formState.pattern?.trim()) {
            setModalError("Pattern is required.");
            return;
        }
        if (!categoryId) {
            setModalError("Category ID is missing."); // Should not happen if route is set up correctly
            return;
        }

        // --- Final Validation on Submit (using magic-regexp for robustness) ---
        if (formState.match_type === 'Regex') {
            try {
                // Attempt to parse the regex pattern
                createRegExp(formState.pattern);
                // Validation passed, ensure specific pattern error is cleared if blur didn't catch it
                setPatternError(null);
                // If successful, proceed. If not, the catch block will handle it.
            } catch (regexError) {
                console.error("Invalid Regex Pattern:", regexError);
                const errorMsg = `Invalid Regular Expression: ${regexError instanceof Error ? regexError.message : 'Syntax error'}`;
                setModalError(errorMsg); // Show general modal error
                setPatternError(errorMsg); // Also show specific pattern error
                return; // Stop submission
            }
        }

        setIsSubmitting(true);
        setModalError(null);
        try {
            if (modalMode === 'addMapping') {
                // await createMappingAPI({ ...formState, category_id: Number(categoryId) } as CreateMappingPayload);

				void dispatch(createMapping({ ...formState, category_id: Number(categoryId) } as CreateMappingPayload))
            } else if (modalMode === 'editMapping' && currentMapping) {
                // await updateMappingAPI(Number(currentMapping.id), formState as UpdateMappingPayload);
				
				void dispatch(editMapping({...formState, id: currentMapping.id} as Partial<CategoryMapping> & {
					id: number;
				}))
            }
            closeModal();
            // await loadMappings(); // Reload mappings
        } catch (err) {
            setModalError(err instanceof Error ? err.message : 'An unknown error occurred');
        } finally {
            setIsSubmitting(false);
        }
    };



    // --- Delete Handlers ---
    const requestDelete = (mapping: CategoryMapping) => {
        setMappingToDelete(mapping);
        setDeleteError(null);
        setIsDeleteModalOpen(true);
    };

    const closeDeleteModal = () => {
        if (isSubmitting) return;
        setIsDeleteModalOpen(false);
        setMappingToDelete(null);
        setDeleteError(null);
    };

    const confirmDelete = async () => {
        if (!mappingToDelete) return;
        setIsSubmitting(true);
        setDeleteError(null);
        try {
            // await deleteMappingAPI(mappingToDelete.id);
			void dispatch(deleteMapping(mappingToDelete.id))
            closeDeleteModal();
            // await loadMappings(); // Reload
        } catch (err) {
            setDeleteError(err instanceof Error ? err.message : 'Failed to delete mapping');
        } finally {
            setIsSubmitting(false);
        }
    };

    // --- Render Logic ---

    // Optional: Handle case where categoryId is missing from route
    if (!categoryId) {
        return <div className="p-4 text-red-400">Error: Category ID not found in URL.</div>;
    }

    return (
        <div className="px-3 py-2 border-t border-secondary-default/10 bg-black/20">
            {/* --- Category Header --- */}
            <div className="pl-10 mb-3 text-base font-medium text-white/90">
                Mappings for: <span className="text-secondary-default">{currentCategoryName || (categoriesLoading ? 'Loading...' : 'Category Not Found')}</span>
            </div>
            {/* --- End Category Header --- */}
            <div className="flex justify-between items-center mb-2 pl-10">
                <h4 className="text-sm font-semibold text-white/70 flex items-center gap-1.5"><ListFilter size={14} /> Mappings</h4>
                <button
                    title="Add New Mapping"
                    onClick={() => openModal('addMapping')}
                    disabled={isSubmitting} // Removed isParentSubmitting
                    className="p-1 rounded text-secondary-default/60 hover:bg-white/10 hover:text-blue-400 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                    <Plus size={16} />
                </button>
            </div>
            {isLoading && (
                <div className="flex items-center justify-center text-sm text-white/50 py-2 pl-10">
                    <Loader2 className="animate-spin h-4 w-4 mr-2" /> Loading mappings...
                </div>
            )}
            {error && (
                <div className="pl-10 text-sm text-red-400 bg-red-900/20 p-2 rounded border border-red-600/40 flex items-center gap-1.5">
                    <AlertCircle size={14} /> Error: {error}
                </div>
            )}
            {!isLoading && !error && (
                mappings.length > 0 ? (
                    <ul className="space-y-1 pl-10">
                        {mappings.map(mapping => (
                            <li key={mapping.id} className="group flex items-center justify-between text-sm bg-black/30 px-2 py-1 rounded">
                                <div className="flex items-center gap-2 truncate mr-2">
                                    <span title={`Priority: ${mapping.priority}`} className="text-xs font-mono text-white/50 w-6 text-right flex-shrink-0">{mapping.priority}</span>
                                    <span title={mapping.match_type} className="text-secondary-default/70 flex-shrink-0">
                                        {mapping.match_type === 'Regex' ? <Regex size={14} /> : <Tag size={14} />}
                                    </span>
                                    <code className="text-white/90 truncate" title={mapping.pattern}>{mapping.pattern}</code>
                                </div>
                                <div className="flex items-center gap-0.5 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button
                                        title="Edit Mapping"
                                        onClick={() => openModal('editMapping', mapping)}
                                        disabled={isSubmitting} // Removed isParentSubmitting
                                        className="p-1 rounded text-secondary-default/50 hover:bg-white/10 hover:text-green-400 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                                    >
                                        <Edit2 size={14} />
                                    </button>
                                    <button
                                        title="Delete Mapping"
                                        onClick={() => requestDelete(mapping)} // Use modal delete
                                        disabled={isSubmitting} // Removed isParentSubmitting
                                        className="p-1 rounded text-secondary-default/50 hover:bg-white/10 hover:text-red-400 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <p className="text-xs text-white/50 pl-10 py-1">No mappings defined for this category.</p>
                )
            )}

            {/* Add/Edit Mapping Modal (JSX copied and adapted from categories.tsx) */}
            {isModalOpen && (
                 <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4" aria-modal="true" role="dialog">
                    <div className="bg-gray-950 rounded-lg shadow-xl p-5 w-full max-w-lg border border-secondary-default/30">
                        <h2 className="text-lg font-semibold mb-4 text-white">
                            {modalMode === 'addMapping' ? 'Add New Mapping' : 'Edit Mapping'}
                        </h2>

                        {modalError && (
                            <div className="mb-3 p-2 bg-red-900/30 text-red-300 border border-red-600/50 rounded text-sm flex items-center gap-2">
                                <AlertCircle size={16} className="flex-shrink-0" />
                                <span>{modalError}</span>
                            </div>
                        )}

                        <form onSubmit={handleModalSubmit}>
                            {/* Pattern Input */}
                            <div className="mb-4">
                                <label htmlFor="mappingPatternInput" className="block text-sm font-medium text-white/80 mb-1">
                                    Transaction Description Pattern
                                </label>
                                <input
                                    type="text"
                                    id="mappingPatternInput"
                                    value={formState.pattern || ''}
                                    onChange={(e) => setFormState(prev => ({ ...prev, pattern: e.target.value }))}
                                    required
                                    className="w-full px-3 py-2 bg-black/50 border border-secondary-default/40 rounded focus:outline-none focus:ring-2 focus:ring-secondary-default text-white placeholder-white/50 font-mono"
                                    placeholder="e.g., 'Coffee Shop' or '/^UBER TRIP/i'"
                                    disabled={isSubmitting}
                                    onBlur={handlePatternBlur} // Add the onBlur handler here
                                />
                                {patternError && (
                                    <p className="mt-1 text-xs text-red-400">{patternError}</p>
                                )}
                                {/* Display Explanation */}
                                {patternExplanation && !patternError && (
                                    <p className="mt-1 text-xs text-gray-400 italic">{patternExplanation}</p>
                                )}
                            </div>


                            {/* Match Type & Priority */}
                            <div className="grid grid-cols-2 gap-4 mb-4">
                                <div>
                                    <label htmlFor="mappingMatchType" className="block text-sm font-medium text-white/80 mb-1">
                                        Match Type
                                    </label>
                                    <select
                                        id="mappingMatchType"
                                        value={formState.match_type || 'Exact'}
                                        onChange={(e) => {
                                            const newType = e.target.value as CategoryMappingsMatch;
                                            setFormState(prev => ({ ...prev, match_type: newType }));
                                            if (newType === 'Exact') {
                                                handlePatternBlur(); // Re-validate (will clear if not regex)
                                            }
                                        }}
                                        className="w-full px-3 py-2 bg-black/50 border border-secondary-default/40 rounded focus:outline-none focus:ring-2 focus:ring-secondary-default text-white"
                                        disabled={isSubmitting}
                                    >
                                        <option value="Exact">Exact Text</option>
                                        <option value="Regex">Regular Expression</option>
                                    </select>
                                </div>
                                <div>
                                    <label htmlFor="mappingPriority" className="block text-sm font-medium text-white/80 mb-1">
                                        Priority <span className='text-xs text-white/50'>(Lower runs first)</span>
                                    </label>
                                    <input
                                        type="number"
                                        id="mappingPriority"
                                        value={formState.priority ?? 10}
                                        onChange={(e) => setFormState(prev => ({ ...prev, priority: parseInt(e.target.value, 10) || 0 }))}
                                        className="w-full px-3 py-2 bg-black/50 border border-secondary-default/40 rounded focus:outline-none focus:ring-2 focus:ring-secondary-default text-white placeholder-white/50"
                                        disabled={isSubmitting}
                                    />
                                </div>
                            </div>

                            <div className="flex justify-end gap-3 mt-6">
                                <button
                                    type="button"
                                    onClick={closeModal}
                                    disabled={isSubmitting}
                                    className="px-4 py-2 bg-gray-700 text-white/80 rounded hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmitting || !formState.pattern?.trim()}
                                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center min-w-[80px] transition-colors cursor-pointer"
                                >
                                    {isSubmitting ? <Loader2 className="animate-spin h-5 w-5" /> : (modalMode === 'addMapping' ? 'Add' : 'Save')}
                                </button>
                            </div>
                        </form>
                    </div>
                 </div>
            )}

            {/* Delete Mapping Confirmation Modal */}
            {isDeleteModalOpen && mappingToDelete && (
                 <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4" aria-modal="true" role="dialog">
                    {/* Basic Delete Modal Structure - Adapt styling as needed */}
                    <div className="bg-gray-950 rounded-lg shadow-xl p-5 w-full max-w-md border border-secondary-default/30">
                        <h2 className="text-lg font-semibold mb-3 text-white">Confirm Deletion</h2>
                        <p className="text-sm text-white/80 mb-4">
                            Are you sure you want to delete the mapping for pattern: <code className="bg-black/50 px-1 py-0.5 rounded text-white/90">{mappingToDelete.pattern}</code>?
                        </p>
                        {deleteError && (
                            <div className="mb-3 p-2 bg-red-900/30 text-red-300 border border-red-600/50 rounded text-sm flex items-center gap-2">
                                <AlertCircle size={16} className="flex-shrink-0" />
                                <span>{deleteError}</span>
                            </div>
                        )}
                        <div className="flex justify-end gap-3 mt-5">
                            <button
                                type="button"
                                onClick={closeDeleteModal}
                                disabled={isSubmitting}
                                className="px-4 py-2 bg-gray-700 text-white/80 rounded hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={confirmDelete}
                                disabled={isSubmitting}
                                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center min-w-[80px] transition-colors cursor-pointer"
                            >
                                {isSubmitting ? <Loader2 className="animate-spin h-5 w-5" /> : 'Delete'}
                            </button>
                        </div>
                    </div>
                 </div>
            )}
        </div>
    );
};