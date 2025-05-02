import React, { useState, useEffect, useCallback, FormEvent } from 'react';
import { Plus, Edit2, Trash2, Loader2, ChevronDown, ChevronRight, AlertCircle, RotateCcw, Eye, EyeOff, Filter } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { ToggleSwitch } from '@/components/toggleSwitch'; // Import the new component
import { NavLink } from 'react-router';
import { useAppDispatch, useAppSelector } from '@/store/store';
import { getAllCategories, type Category } from '@/store/thunks/category.get.all';
import { createCategory } from '@/store/thunks/category.create.single';
import { updateCategory } from '@/store/thunks/category.update.single';
import { deleteCategory } from '@/store/thunks/category.delete.single';
import { restoreCategory } from '@/store/thunks/category.restore.single';

// Define the Transaction type based on your schema
// --- Type Definitions ---
type Subcategory = {
    id: string;
    name: string;
    deleted_at?: string | null;
};

// Helper function (can be placed in a utils file or within the component)
const getRandomHexColor = (): string => {
    // Ensure it generates a full 6-digit hex code
    const randomColor = Math.floor(Math.random()*16777215).toString(16);
    return `#${randomColor.padStart(6, '0')}`;
};

// --- Component ---

export const CategoriesPage = () => {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [modalError, setModalError] = useState<string | null>(null);

    // Add/Edit Modal State
    type ModalMode = 'addMain' | 'editMain' | 'addSub' | 'editSub';
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState<ModalMode>('addMain');
    const [currentItem, setCurrentItem] = useState<Category | Subcategory | null>(null);
    const [parentCategory, setParentCategory] = useState<Category | null>(null);
    const [inputValue, setInputValue] = useState('');
    const [inputColour, setInputColour] = useState<string>('#ffffff'); // State for colour input, default white

    // Delete Modal State
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [itemToDelete, setItemToDelete] = useState<Category | Subcategory | null>(null);
    const [isMainCategoryDelete, setIsMainCategoryDelete] = useState(false);

    // View State
    const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
    const [showDeleted, setShowDeleted] = useState(false);

	const {categories, categoriesError, categoriesLoading} = useAppSelector(state => state.CategoryReducer)
	const dispatch = useAppDispatch();
    // Initial fetch and refetch when showDeleted changes
    useEffect(() => {
        void dispatch(getAllCategories());
    }, []);

    // --- Modal Handling ---
    const openModal = (mode: ModalMode, item?: Category | Subcategory, parent?: Category) => {
        setModalMode(mode);
        setCurrentItem(item || null);
        setParentCategory(parent || null);
        setInputValue((mode === 'editMain' || mode === 'editSub') && item ? item.name : '');
        // Set colour for both main and sub category edit modes
        if ((mode === 'editMain' || mode === 'editSub') && item && 'colour' in item) {
            setInputColour(item.colour || getRandomHexColor()); // Use existing or generate if null/undefined
        } else if (mode === 'addMain' || mode === 'addSub') {
            setInputColour(getRandomHexColor()); // Set a random default for add mode
        } else {
            setInputColour('#ffffff'); // Fallback default (shouldn't be reached often)
        }
        setModalError(null);
        setIsModalOpen(true);
    };

    const closeModal = () => {
        if (isSubmitting) return;
        setIsModalOpen(false);
        setInputValue('');
        setCurrentItem(null);
        setParentCategory(null);
        setInputColour('#ffffff'); // Reset colour on close
        setModalError(null);
    };

    // --- Delete Modal Handling ---
    const openDeleteModal = (item: Category | Subcategory) => {
        const isMain = categories.some(cat => cat.id === item.id);
        setItemToDelete(item);
        setIsMainCategoryDelete(isMain);
        setIsDeleteModalOpen(true);
    };

    const closeDeleteModal = () => {
        if (isSubmitting) return;
        setIsDeleteModalOpen(false);
        setItemToDelete(null);
    };

    // --- CRUD Handlers ---
    const handleModalSubmit = async (event: FormEvent) => {
        event.preventDefault();
        const trimmedValue = inputValue.trim();
        if (!trimmedValue) {
            setModalError("Name cannot be empty.");
            return;
        }
        setIsSubmitting(true);
        setModalError(null);
        try {
            if (modalMode === 'addMain') {
                // Generate random color if default wasn't changed or is invalid? Or rely on thunk/backend.
                // For now, we pass the current inputColour. Thunk should handle if it's missing.
				void dispatch(createCategory({
					name: trimmedValue,
                    colour: inputColour // Pass the selected/generated colour
				}));
            } else if (modalMode === 'addSub' && parentCategory) {
                void dispatch(createCategory({
					name: trimmedValue,
					parent_category_id: parentCategory.id
				}))
            } else if ((modalMode === 'editMain' || modalMode === 'editSub') && currentItem && 'colour' in currentItem) { // Check 'colour' exists for type safety
				void dispatch(updateCategory({
					id: currentItem.id,
					name: trimmedValue,
                    // Include colour when editing either main or sub category
                    colour: inputColour
				}));
            }
            closeModal();
            // await loadCategories();
        } catch (err) {
            setModalError(err instanceof Error ? err.message : 'An unknown error occurred');
        } finally {
            setIsSubmitting(false);
        }
    };

    const requestDelete = (itemToDelete: Category | Subcategory) => {
        openDeleteModal(itemToDelete);
    };

    const confirmDelete = async () => {
        if (!itemToDelete) return;
        setIsSubmitting(true);
        setError(null);
        try {
            // await deleteCategoryAPI(itemToDelete.id);
			void dispatch(deleteCategory(Number(itemToDelete.id)))
            closeDeleteModal();
            // await loadCategories();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An unknown error occurred during deletion');
            closeDeleteModal();
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleRestore = async (itemToRestore: Category | Subcategory) => {
        setIsSubmitting(true);
        setError(null);
        try {
            // await restoreCategoryAPI(itemToRestore.id);
            // await loadCategories();

			void dispatch(restoreCategory(Number(itemToRestore.id)))
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An unknown error occurred during restore');
        } finally {
            setIsSubmitting(false);
        }
    };

    // --- Toggle Expansion ---
    const toggleExpand = (categoryId: string) => {
        setExpandedCategories(prev => {
            const newSet = new Set(prev);
            if (newSet.has(categoryId)) {
                newSet.delete(categoryId);
            } else {
                newSet.add(categoryId);
            }
            return newSet;
        });
    };


    // --- Render Logic ---
    return (
        <div className="p-4 md:p-6 text-white/90">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-semibold text-white">Manage Categories</h1>

                <ToggleSwitch
                    checked={showDeleted}
                    onChange={setShowDeleted}
                    label="Show Deleted"
                    icons={{
                        on: <Eye size={16} />,
                        off: <EyeOff size={16} />,
                    }}
                />

            </div>


            <div className="mb-6">
                {/* --- UPDATED BUTTON STYLE --- */}
                <button
                    onClick={() => openModal('addMain')}
                    disabled={isSubmitting}
                    className="inline-flex items-center px-4 py-2 bg-transparent border border-secondary-default/50 text-secondary-default rounded hover:bg-secondary-default/10 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
                >
                    <Plus size={18} className="mr-2" />
                    Add Main Category
                </button>
                 {/* --- END UPDATE --- */}
            </div>

            {/* Loading Indicator */}
            {categoriesLoading && categories.length === 0 && (
                <div className="flex justify-center items-center p-8">
                    <Loader2 className="animate-spin h-8 w-8 text-secondary-default" />
                    <span className="ml-2 text-white/70">Loading Categories...</span>
                </div>
            )}

            {/* Error Display */}
            {error && (
                <div className="mb-4 p-3 bg-red-900/30 border border-red-600/50 text-red-300 rounded flex items-center gap-2">
                    <AlertCircle size={18} className="flex-shrink-0" />
                    <span>Error: {error}</span>
                    <button onClick={() => setError(null)} className="ml-auto text-red-200 hover:text-white cursor-pointer">&times;</button>
                </div>
            )}

            {/* Empty State */}
            {!categoriesLoading && categories.length === 0 && !error && (
                 <p className="text-white/50 mt-6 text-center">
                    {showDeleted ? "No categories (including deleted) found." : "No categories found. Add one to get started!"}
                 </p>
            )}

            {/* Category List */}
            <div className="space-y-1">
                {categories.filter(cat => !Boolean(cat.parent_category_id) && (showDeleted ? true : !Boolean(cat.deleted_at))).map((category) => {
                    const isDeleted = !!category.deleted_at;

					const sub_categories = categories.filter(cat => cat.parent_category_id === category.id &&( showDeleted ? true : !Boolean(cat.deleted_at)))

                    return (
                        <div key={category.id} className={cn(
                            "rounded bg-black border border-secondary-default/20 shadow-sm overflow-hidden transition-opacity",
                            isDeleted && "opacity-60 border-red-500/30 bg-red-900/10"
                        )}>
                            {/* Main Category Row */}
                            <div className={cn(
                                "group flex items-center justify-between p-3 transition-colors duration-150",
                                !isDeleted && "hover:bg-white/5 cursor-pointer"
                            )}
                                onClick={() => !isDeleted && toggleExpand(category.id)}
                            >
                                <div className="flex items-center gap-2 flex-grow min-w-0">
                                    <span
                                        className={cn("p-1 text-secondary-default/60 disabled:opacity-30", !isDeleted && "group-hover:text-secondary-default")}
                                        aria-hidden="true"
                                    >
                                        {sub_categories.length > 0 ? (
                                            expandedCategories.has(category.id) ? <ChevronDown size={18} /> : <ChevronRight size={18} />
                                        ) : (
                                            <span className="inline-block w-[18px] h-[18px]"></span>
                                        )}
                                    </span>
                                    {/* Colour Indicator */}
                                    {!isDeleted && category.colour && (
                                        <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: category.colour }} title={`Colour: ${category.colour}`}></span>
                                    )}
                                    {/* Category Name */}
                                    <span className={cn(
                                        "font-medium text-white truncate",
                                        isDeleted && "line-through text-white/50"
                                    )}>{category.name}</span>
                                    {sub_categories.length > 0 && (
                                        <span className="text-xs text-white/50 ml-1 flex-shrink-0">({sub_categories.length})</span>
                                    )}
                                </div>
                                {/* Action Buttons */}
                                <div className={cn(
                                    "flex items-center gap-1 flex-shrink-0 ml-2 transition-opacity duration-150",
                                    isDeleted ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                                )}
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    {isDeleted ? (
                                        <button
                                            title="Restore Category"
                                            onClick={() => handleRestore(category)}
                                            disabled={isSubmitting}
                                            className="p-1.5 rounded text-secondary-default/60 hover:bg-white/10 hover:text-green-400 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                                        >
                                            {isSubmitting ? <Loader2 className="animate-spin h-4 w-4" /> : <RotateCcw size={16} />}
                                        </button>
                                    ) : (
                                        <>
										<NavLink to={"/category_mapping/" + category.id}>
											<button
                                                title="Manage mappings"
                                               
                                                disabled={isSubmitting}
                                                className="p-1.5 rounded text-secondary-default/60 hover:bg-white/10 hover:text-blue-400 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                                            >
                                                <Filter size={16} />
                                            </button>
										</NavLink>
                                            <button
                                                title="Add Subcategory"
                                                onClick={() => openModal('addSub', undefined, category)}
                                                disabled={isSubmitting}
                                                className="p-1.5 rounded text-secondary-default/60 hover:bg-white/10 hover:text-blue-400 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                                            >
                                                <Plus size={16} />
                                            </button>
                                            <button
                                                title="Edit Category Name"
                                                onClick={() => openModal('editMain', category)}
                                                disabled={isSubmitting}
                                                className="p-1.5 rounded text-secondary-default/60 hover:bg-white/10 hover:text-green-400 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                                            >
                                                <Edit2 size={16} />
                                            </button>
                                            <button
                                                title="Delete Category"
                                                onClick={() => requestDelete(category)}
                                                disabled={isSubmitting}
                                                className="p-1.5 rounded text-secondary-default/60 hover:bg-white/10 hover:text-red-400 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>

                            {/* Subcategory List */}
                            {expandedCategories.has(category.id) && !isDeleted && (
                                <div className="bg-black/40 border-t border-secondary-default/10">
                                    {sub_categories.length > 0 ? (
                                        <ul className="py-2">
                                            {sub_categories.map((sub) => {
                                                const isSubDeleted = !!sub.deleted_at;
                                                return (
                                                    <li key={sub.id} className={cn(
                                                        "group flex items-center justify-between px-3 py-1.5 transition-opacity",
                                                        !isSubDeleted && "hover:bg-white/5",
                                                        isSubDeleted && "opacity-60"
                                                    )}>
                                                        {/* Subcategory Colour Indicator */}
                                                        {/* Subcategory Name */}
														
														<span className='flex items-center'>
															{!isSubDeleted && sub.colour && (
																<div className="w-2.5 h-2.5 rounded-full flex-shrink-0 ml-10 mr-2 relative" style={{ backgroundColor: sub.colour }} title={`Colour: ${sub.colour}`}></div>
															)}
															<span className={cn(
																"text-white/80 text-sm pl-10 truncate",
																isSubDeleted && "line-through text-white/50"
															)}>
																{sub.name}
															</span>
														</span>
                                                        <div className={cn(
                                                            "flex items-center gap-1 flex-shrink-0 ml-2 transition-opacity duration-150",
                                                            isSubDeleted ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                                                        )}>
                                                            {isSubDeleted ? (
                                                                <button
                                                                    title="Restore Subcategory"
                                                                    onClick={() => handleRestore(sub)}
                                                                    disabled={isSubmitting}
                                                                    className="p-1 rounded text-secondary-default/50 hover:bg-white/10 hover:text-green-400 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                                                                >
                                                                     {isSubmitting ? <Loader2 className="animate-spin h-3.5 w-3.5" /> : <RotateCcw size={14}/>}
                                                                </button>
                                                            ) : (
                                                                <>
																<NavLink to={"/category_mapping/" + sub.id}>
																	<button
																		title="Manage mappings"
																	
																		disabled={isSubmitting}
																		className="p-1.5 rounded text-secondary-default/60 hover:bg-white/10 hover:text-blue-400 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
																	>
																		<Filter size={16} />
																	</button>
																</NavLink>
                                                                    <button
                                                                        title="Edit Subcategory Name"
                                                                        onClick={() => openModal('editSub', sub, category)}
                                                                        disabled={isSubmitting}
                                                                        className="p-1 rounded text-secondary-default/50 hover:bg-white/10 hover:text-green-400 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                                                                    >
                                                                         <Edit2 size={14}/>
                                                                    </button>
                                                                    <button
                                                                        title="Delete Subcategory"
                                                                        onClick={() => requestDelete(sub)}
                                                                        disabled={isSubmitting}
                                                                        className="p-1 rounded text-secondary-default/50 hover:bg-white/10 hover:text-red-400 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                                                                    >
                                                                        <Trash2 size={14} />
                                                                    </button>
                                                                </>
                                                            )}
                                                        </div>
                                                    </li>
                                                );
                                            })}
                                        </ul>
                                    ) : (
                                        <p className="px-3 py-2 text-sm text-white/50 pl-14">No subcategories defined.</p>
                                    )}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>


            {/* --- Add/Edit Modal --- */}
            {isModalOpen && (
                 <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4" aria-modal="true" role="dialog">
                    <div className="bg-gray-950 rounded-lg shadow-xl p-5 w-full max-w-md border border-secondary-default/30">
                        <h2 className="text-lg font-semibold mb-4 text-white">
                            {modalMode === 'addMain' && 'Add New Main Category'}
                            {modalMode === 'editMain' && 'Edit Main Category Name'}
                            {modalMode === 'addSub' && `Add Subcategory to "${parentCategory?.name}"`}
                            {modalMode === 'editSub' && `Edit Subcategory Name`}
                        </h2>

                        {modalError && (
                            <div className="mb-3 p-2 bg-red-900/30 text-red-300 border border-red-600/50 rounded text-sm flex items-center gap-2">
                                <AlertCircle size={16} className="flex-shrink-0" />
                                <span>{modalError}</span>
                            </div>
                        )}

                        <form onSubmit={handleModalSubmit}>
                            <div className="mb-4">
                                <label htmlFor="categoryNameInput" className="block text-sm font-medium text-white/80 mb-1">
                                    {modalMode === 'addSub' || modalMode === 'editSub' ? 'Subcategory Name' : 'Category Name'}
                                </label>
                                <input
                                    type="text"
                                    id="categoryNameInput"
                                    value={inputValue}
                                    onChange={(e) => setInputValue(e.target.value)}
                                    required
                                    className="w-full px-3 py-2 bg-black/50 border border-secondary-default/40 rounded focus:outline-none focus:ring-2 focus:ring-secondary-default text-white placeholder-white/50"
                                    placeholder={modalMode === 'addSub' || modalMode === 'editSub' ? 'Enter subcategory name' : 'Enter category name'}
                                    disabled={isSubmitting}
                                />
                            </div>
                            {/* Colour Picker - Now shown for all add/edit modes */}
                            <div className="mb-4">
                                <label htmlFor="categoryColourInput" className="block text-sm font-medium text-white/80 mb-1">
                                    Category Colour
                                </label>
                                <input
                                    type="color"
                                    id="categoryColourInput"
                                    value={inputColour}
                                    onChange={(e) => setInputColour(e.target.value)}
                                    className="w-full h-10 px-1 py-1 bg-black/50 border border-secondary-default/40 rounded focus:outline-none focus:ring-2 focus:ring-secondary-default cursor-pointer"
                                    disabled={isSubmitting}
                                />
                            </div>
                            {/* End Colour Picker */}
                            <div className="flex justify-end gap-3 mt-5">
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
                                    disabled={isSubmitting || !inputValue.trim()}
                                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center min-w-[80px] transition-colors cursor-pointer"
                                >
                                    {isSubmitting ? (
                                        <Loader2 className="animate-spin h-5 w-5" />
                                    ) : (
                                        (modalMode === 'addMain' || modalMode === 'addSub') ? 'Add' : 'Save'
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                 </div>
            )}

            {/* --- Delete Confirmation Modal --- */}
            {isDeleteModalOpen && itemToDelete && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4" aria-modal="true" role="dialog">
                    <div className="bg-gray-950 rounded-lg shadow-xl p-5 w-full max-w-md border border-secondary-default/30">
                        <h2 className="text-lg font-semibold mb-4 text-red-400 flex items-center gap-2">
                            <AlertCircle size={20} /> Confirm Deletion
                        </h2>
                        <p className="text-white/80 mb-6">
                            Are you sure you want to delete the category{' '}
                            <strong className="text-white">"{itemToDelete.name}"</strong>?
                            {isMainCategoryDelete && (
                                <span className="block mt-2 text-sm text-yellow-400">
                                    This is a main category. Deleting it may also delete ALL its subcategories depending on backend logic.
                                </span>
                            )}
                            <span className="block mt-3 text-sm text-white/60">This action cannot be undone.</span>
                        </p>

                        {error && (
                            <div className="mb-4 p-2 bg-red-900/40 text-red-300 border border-red-600/50 rounded text-sm flex items-center gap-2">
                                <AlertCircle size={16} className="flex-shrink-0" />
                                <span>{error}</span>
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
                                className="px-4 py-2 bg-red-700 text-white rounded hover:bg-red-800 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center min-w-[120px] transition-colors cursor-pointer"
                            >
                                {isSubmitting ? (
                                    <Loader2 className="animate-spin h-5 w-5" />
                                ) : (
                                    'Confirm Delete'
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {/* --- END Delete Confirmation Modal --- */}

        </div>
    );
};
