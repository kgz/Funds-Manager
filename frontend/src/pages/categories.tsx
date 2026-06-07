import { useState, useEffect, FormEvent, DragEvent } from 'react';
import {
	Plus,
	Edit2,
	Trash2,
	Loader2,
	ChevronDown,
	ChevronRight,
	AlertCircle,
	RotateCcw,
	Eye,
	EyeOff,
	ArrowRight,
	Search,
	GripVertical,
	GitMerge,
	FolderOpen,
} from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { ToggleSwitch } from '@/components/toggleSwitch';
import { NavLink } from 'react-router';
import { useAppDispatch, useAppSelector } from '@/store/store';
import { getAllCategories, type Category } from '@/store/thunks/category.get.all';
import { createCategory } from '@/store/thunks/category.create.single';
import { updateCategory } from '@/store/thunks/category.update.single';
import { deleteCategory } from '@/store/thunks/category.delete.single';
import { restoreCategory } from '@/store/thunks/category.restore.single';
import { mergeCategory } from '@/store/thunks/category.merge.single';
import { reorderCategories } from '@/store/thunks/category.reorder';
import { readThunkRejectMessage } from '@/lib/utils/thunkError';
import {
	categoryDeleteUsageWarning,
	categoryUsageLabel,
	categoryUsageTitle,
	uncategorizedBannerText,
} from '@/lib/utils/categoryUsage';
import {
	readExpandedCategoryIds,
	writeExpandedCategoryIds,
} from '@/lib/utils/categoryExpandStorage';
import {
	shouldExpandForSearch,
	visibleMainCategories,
	visibleSubcategories,
} from '@/lib/utils/categoryFilter';

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
    const [currentItem, setCurrentItem] = useState<Category | null>(null);
    const [parentCategory, setParentCategory] = useState<Category | null>(null);
    const [inputValue, setInputValue] = useState('');
    const [inputDescription, setInputDescription] = useState('');
    const [inputColour, setInputColour] = useState<string>('#ffffff');

    const [searchQuery, setSearchQuery] = useState('');
    const [draggingId, setDraggingId] = useState<string | null>(null);

    // Merge Modal State
    const [isMergeModalOpen, setIsMergeModalOpen] = useState(false);
    const [itemToMerge, setItemToMerge] = useState<Category | null>(null);
    const [mergeTargetId, setMergeTargetId] = useState('');

    // Delete Modal State
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [itemToDelete, setItemToDelete] = useState<Category | null>(null);
    const [isMainCategoryDelete, setIsMainCategoryDelete] = useState(false);

    // View State
    const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
        () => readExpandedCategoryIds()
    );
    const [showDeleted, setShowDeleted] = useState(false);

	const { categories, categoriesError, categoriesLoading, uncategorized } =
		useAppSelector((state) => state.CategoryReducer);
	const dispatch = useAppDispatch();

    const reloadCategories = () => {
        void dispatch(getAllCategories({ withCounts: true }));
    };

    useEffect(() => {
        reloadCategories();
    }, []);

    // --- Modal Handling ---
    const openModal = (mode: ModalMode, item?: Category, parent?: Category) => {
        setModalMode(mode);
        setCurrentItem(item || null);
        setParentCategory(parent || null);
        setInputValue((mode === 'editMain' || mode === 'editSub') && item ? item.name : '');
        setInputDescription(
            (mode === 'editMain' || mode === 'editSub') && item?.description
                ? item.description
                : ''
        );
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
        setInputDescription('');
        setCurrentItem(null);
        setParentCategory(null);
        setInputColour('#ffffff');
        setModalError(null);
    };

    // --- Delete Modal Handling ---
    const openDeleteModal = (item: Category) => {
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
            const trimmedDescription = inputDescription.trim();
            const descriptionPayload =
                trimmedDescription.length > 0 ? trimmedDescription : null;

            if (modalMode === 'addMain') {
				await dispatch(createCategory({
					name: trimmedValue,
                    description: descriptionPayload,
                    colour: inputColour,
				})).unwrap();
            } else if (modalMode === 'addSub' && parentCategory) {
                await dispatch(createCategory({
					name: trimmedValue,
                    description: descriptionPayload,
					parent_category_id: parentCategory.id,
                    colour: inputColour,
				})).unwrap();
            } else if ((modalMode === 'editMain' || modalMode === 'editSub') && currentItem && 'colour' in currentItem) {
				await dispatch(updateCategory({
					id: currentItem.id,
					name: trimmedValue,
                    description: descriptionPayload,
                    colour: inputColour,
				})).unwrap();
            }
            closeModal();
            reloadCategories();
        } catch (err) {
            setModalError(readThunkRejectMessage(err, 'Failed to save category'));
        } finally {
            setIsSubmitting(false);
        }
    };

    const requestDelete = (itemToDelete: Category) => {
        openDeleteModal(itemToDelete);
    };

    const confirmDelete = async () => {
        if (!itemToDelete) return;
        setIsSubmitting(true);
        setError(null);
        try {
			await dispatch(deleteCategory(Number(itemToDelete.id))).unwrap();
            closeDeleteModal();
            reloadCategories();
        } catch (err) {
            setError(readThunkRejectMessage(err, 'Failed to delete category'));
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleRestore = async (itemToRestore: Category) => {
        setIsSubmitting(true);
        setError(null);
        try {
			await dispatch(restoreCategory(Number(itemToRestore.id))).unwrap();
            reloadCategories();
        } catch (err) {
            setError(readThunkRejectMessage(err, 'Failed to restore category'));
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
            writeExpandedCategoryIds(newSet);
            return newSet;
        });
    };

    const openMergeModal = (item: Category) => {
        setItemToMerge(item);
        setMergeTargetId('');
        setModalError(null);
        setIsMergeModalOpen(true);
    };

    const closeMergeModal = () => {
        if (isSubmitting) return;
        setIsMergeModalOpen(false);
        setItemToMerge(null);
        setMergeTargetId('');
        setModalError(null);
    };

    const confirmMerge = async () => {
        if (!itemToMerge || !mergeTargetId) return;
        setIsSubmitting(true);
        setModalError(null);
        try {
            await dispatch(mergeCategory({
                sourceId: itemToMerge.id,
                targetCategoryId: mergeTargetId,
            })).unwrap();
            closeMergeModal();
            reloadCategories();
        } catch (err) {
            setModalError(readThunkRejectMessage(err, 'Failed to merge categories'));
        } finally {
            setIsSubmitting(false);
        }
    };

    const persistReorder = async (orderedIds: string[]) => {
        if (orderedIds.length === 0) return;
        setError(null);
        try {
            await dispatch(reorderCategories({ orderedIds })).unwrap();
            reloadCategories();
        } catch (err) {
            setError(readThunkRejectMessage(err, 'Failed to reorder categories'));
            reloadCategories();
        }
    };

    const reorderByDrag = (
        items: Category[],
        dragId: string,
        dropId: string
    ): Category[] => {
        const fromIndex = items.findIndex((item) => item.id === dragId);
        const toIndex = items.findIndex((item) => item.id === dropId);
        if (fromIndex < 0 || toIndex < 0 || fromIndex === toIndex) {
            return items;
        }
        const next = [...items];
        const [moved] = next.splice(fromIndex, 1);
        next.splice(toIndex, 0, moved);
        return next;
    };

    const handleMainDrop = (dropId: string) => {
        if (!draggingId || draggingId === dropId) return;
        const mains = visibleMainCategories(categories, searchQuery, showDeleted);
        const reordered = reorderByDrag(mains, draggingId, dropId);
        void persistReorder(reordered.map((item) => item.id));
        setDraggingId(null);
    };

    const handleSubDrop = (parentId: string, dropId: string) => {
        if (!draggingId || draggingId === dropId) return;
        const subs = visibleSubcategories(
            categories,
            parentId,
            searchQuery,
            showDeleted
        );
        const reordered = reorderByDrag(subs, draggingId, dropId);
        void persistReorder(reordered.map((item) => item.id));
        setDraggingId(null);
    };

    const onDragStart = (event: DragEvent<HTMLElement>, categoryId: string) => {
        event.dataTransfer.effectAllowed = 'move';
        setDraggingId(categoryId);
    };

    const onDragEnd = () => {
        setDraggingId(null);
    };

    const mergeTargetOptions = categories.filter((cat) => {
        if (!itemToMerge || cat.id === itemToMerge.id || cat.deleted_at) {
            return false;
        }
        return true;
    });

    const mainCategories = visibleMainCategories(categories, searchQuery, showDeleted);

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


            <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <button
                    onClick={() => openModal('addMain')}
                    disabled={isSubmitting}
                    className="inline-flex items-center px-4 py-2 bg-transparent border border-secondary-default/50 text-secondary-default rounded hover:bg-secondary-default/10 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
                >
                    <Plus size={18} className="mr-2" />
                    Add Main Category
                </button>
                <div className="relative w-full sm:max-w-xs">
                    <Search
                        size={16}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40"
                    />
                    <input
                        type="search"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search categories..."
                        className="w-full rounded-lg border border-white/10 bg-white/5 py-2 pl-9 pr-3 text-sm text-white placeholder:text-white/40 focus:border-secondary-default/50 focus:outline-none focus:ring-1 focus:ring-secondary-default/50"
                    />
                </div>
            </div>

            {categoriesLoading && categories.length === 0 && (
                <div className="rounded-xl border border-white/10 bg-white/5 p-8">
                    <div className="flex items-center justify-center gap-3">
                        <Loader2 className="h-6 w-6 animate-spin text-secondary-default" />
                        <span className="text-white/70">Loading categories...</span>
                    </div>
                </div>
            )}

            {uncategorized !== null && uncategorized.line_count > 0 && (
                <div className="mb-4 p-3 bg-amber-900/20 border border-amber-600/40 text-amber-100 rounded flex items-center justify-between gap-3">
                    <span title="Individual lines imported from your bank statements">
                        {uncategorizedBannerText(uncategorized)}
                    </span>
                    <NavLink
                        to="/transactions?uncategorized=1"
                        className="inline-flex items-center gap-1 text-sm text-amber-200 hover:text-white whitespace-nowrap"
                    >
                        Review on Transactions
                        <ArrowRight size={14} />
                    </NavLink>
                </div>
            )}

            {(error || categoriesError) && (
                <div className="mb-4 p-3 bg-red-900/30 border border-red-600/50 text-red-300 rounded flex items-center gap-2">
                    <AlertCircle size={18} className="flex-shrink-0" />
                    <span>Error: {error ?? categoriesError}</span>
                    <button
                        onClick={() => {
                            setError(null);
                        }}
                        className="ml-auto text-red-200 hover:text-white cursor-pointer"
                    >
                        &times;
                    </button>
                </div>
            )}

            {!categoriesLoading && categories.length === 0 && !error && !categoriesError && (
                <div className="rounded-xl border border-white/10 bg-white/5 p-8 text-center">
                    <FolderOpen className="mx-auto h-10 w-10 text-white/40" />
                    <p className="mt-3 text-white/60">
                        {showDeleted
                            ? 'No categories (including deleted) found.'
                            : 'No categories yet. Add one to get started.'}
                    </p>
                </div>
            )}

            {!categoriesLoading && categories.length > 0 && mainCategories.length === 0 && (
                <div className="rounded-xl border border-white/10 bg-white/5 p-8 text-center">
                    <Search className="mx-auto h-10 w-10 text-white/40" />
                    <p className="mt-3 text-white/60">No categories match your search.</p>
                </div>
            )}

            <div className="space-y-1">
                {mainCategories.map((category) => {
                    const isDeleted = !!category.deleted_at;
                    const categoryUsage = categoryUsageLabel(category);
                    const categoryUsageHint = categoryUsageTitle(category);
                    const isExpanded =
                        expandedCategories.has(category.id) ||
                        shouldExpandForSearch(
                            categories,
                            category.id,
                            searchQuery,
                            showDeleted
                        );

					const sub_categories = visibleSubcategories(
                        categories,
                        category.id,
                        searchQuery,
                        showDeleted
                    );

                    return (
                        <div
                            key={category.id}
                            className={cn(
                                "rounded-xl border border-white/10 bg-white/5 overflow-hidden transition-opacity",
                                isDeleted && "opacity-60 border-red-500/30 bg-red-900/10",
                                draggingId === category.id && "opacity-50"
                            )}
                            onDragOver={(e) => {
                                if (!isDeleted) e.preventDefault();
                            }}
                            onDrop={(e) => {
                                e.preventDefault();
                                if (!isDeleted) handleMainDrop(category.id);
                            }}
                        >
                            <div className={cn(
                                "group flex items-center justify-between p-3 transition-colors duration-150",
                                !isDeleted && "hover:bg-white/5"
                            )}
                            >
                                <div className="flex items-center gap-2 flex-grow min-w-0">
                                    {!isDeleted && (
                                        <button
                                            type="button"
                                            draggable
                                            onDragStart={(e) => onDragStart(e, category.id)}
                                            onDragEnd={onDragEnd}
                                            onClick={(e) => e.stopPropagation()}
                                            className="p-1 text-white/30 hover:text-white/60 cursor-grab active:cursor-grabbing"
                                            title="Drag to reorder"
                                        >
                                            <GripVertical size={16} />
                                        </button>
                                    )}
                                    <button
                                        type="button"
                                        className={cn(
                                            "flex items-center gap-2 flex-grow min-w-0 text-left",
                                            !isDeleted && "cursor-pointer"
                                        )}
                                        onClick={() => !isDeleted && toggleExpand(category.id)}
                                    >
                                    <span
                                        className={cn("p-1 text-secondary-default/60 disabled:opacity-30", !isDeleted && "group-hover:text-secondary-default")}
                                        aria-hidden="true"
                                    >
                                        {sub_categories.length > 0 ? (
                                            isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />
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
                                        <span className="text-xs text-white/50 ml-1 flex-shrink-0">({sub_categories.length} sub)</span>
                                    )}
                                    {categoryUsage && (
                                        <span
                                            className="text-xs text-white/40 ml-1 flex-shrink-0"
                                            title={categoryUsageHint ?? undefined}
                                        >
                                            {categoryUsage}
                                        </span>
                                    )}
                                    </button>
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
                                            <button
                                                title="Add Subcategory"
                                                onClick={() => openModal('addSub', undefined, category)}
                                                disabled={isSubmitting}
                                                className="p-1.5 rounded text-secondary-default/60 hover:bg-white/10 hover:text-blue-400 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                                            >
                                                <Plus size={16} />
                                            </button>
                                            <button
                                                title="Edit Category"
                                                onClick={() => openModal('editMain', category)}
                                                disabled={isSubmitting}
                                                className="p-1.5 rounded text-secondary-default/60 hover:bg-white/10 hover:text-green-400 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                                            >
                                                <Edit2 size={16} />
                                            </button>
                                            <button
                                                title="Merge into another category"
                                                onClick={() => openMergeModal(category)}
                                                disabled={isSubmitting}
                                                className="p-1.5 rounded text-secondary-default/60 hover:bg-white/10 hover:text-amber-400 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                                            >
                                                <GitMerge size={16} />
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
                            {isExpanded && !isDeleted && (
                                <div className="border-t border-white/10 bg-black/20">
                                    {sub_categories.length > 0 ? (
                                        <ul className="py-2">
                                            {sub_categories.map((sub) => {
                                                const isSubDeleted = !!sub.deleted_at;
                                                const subUsage = categoryUsageLabel(sub);
                                                const subUsageHint = categoryUsageTitle(sub);
                                                return (
                                                    <li
                                                        key={sub.id}
                                                        className={cn(
                                                            "group flex items-center justify-between px-3 py-1.5 transition-opacity",
                                                            !isSubDeleted && "hover:bg-white/5",
                                                            isSubDeleted && "opacity-60",
                                                            draggingId === sub.id && "opacity-50"
                                                        )}
                                                        onDragOver={(e) => {
                                                            if (!isSubDeleted) e.preventDefault();
                                                        }}
                                                        onDrop={(e) => {
                                                            e.preventDefault();
                                                            if (!isSubDeleted) {
                                                                handleSubDrop(category.id, sub.id);
                                                            }
                                                        }}
                                                    >
														<span className='flex items-center min-w-0'>
                                                            {!isSubDeleted && (
                                                                <button
                                                                    type="button"
                                                                    draggable
                                                                    onDragStart={(e) => onDragStart(e, sub.id)}
                                                                    onDragEnd={onDragEnd}
                                                                    className="p-1 ml-6 text-white/30 hover:text-white/60 cursor-grab active:cursor-grabbing"
                                                                    title="Drag to reorder"
                                                                >
                                                                    <GripVertical size={14} />
                                                                </button>
                                                            )}
															{!isSubDeleted && sub.colour && (
																<div className="w-2.5 h-2.5 rounded-full flex-shrink-0 ml-10 mr-2 relative" style={{ backgroundColor: sub.colour }} title={`Colour: ${sub.colour}`}></div>
															)}
															<span className={cn(
																"text-white/80 text-sm truncate",
																isSubDeleted && "line-through text-white/50"
															)}>
																{sub.name}
															</span>
                                                            {subUsage && (
                                                                <span
                                                                    className="text-xs text-white/40 ml-2 flex-shrink-0"
                                                                    title={subUsageHint ?? undefined}
                                                                >
                                                                    {subUsage}
                                                                </span>
                                                            )}
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
                                                                    <button
                                                                        title="Edit Subcategory"
                                                                        onClick={() => openModal('editSub', sub, category)}
                                                                        disabled={isSubmitting}
                                                                        className="p-1 rounded text-secondary-default/50 hover:bg-white/10 hover:text-green-400 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                                                                    >
                                                                         <Edit2 size={14}/>
                                                                    </button>
                                                                    <button
                                                                        title="Merge into another category"
                                                                        onClick={() => openMergeModal(sub)}
                                                                        disabled={isSubmitting}
                                                                        className="p-1 rounded text-secondary-default/50 hover:bg-white/10 hover:text-amber-400 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                                                                    >
                                                                        <GitMerge size={14} />
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
                            {modalMode === 'editMain' && 'Edit Main Category'}
                            {modalMode === 'addSub' && `Add Subcategory to "${parentCategory?.name}"`}
                            {modalMode === 'editSub' && 'Edit Subcategory'}
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
                            <div className="mb-4">
                                <label htmlFor="categoryDescriptionInput" className="block text-sm font-medium text-white/80 mb-1">
                                    Description (optional)
                                </label>
                                <textarea
                                    id="categoryDescriptionInput"
                                    value={inputDescription}
                                    onChange={(e) => setInputDescription(e.target.value)}
                                    rows={3}
                                    className="w-full px-3 py-2 bg-black/50 border border-secondary-default/40 rounded focus:outline-none focus:ring-2 focus:ring-secondary-default text-white placeholder-white/50 resize-y min-h-[4.5rem]"
                                    placeholder="What kinds of transactions belong here?"
                                    disabled={isSubmitting}
                                />
                            </div>
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

            {isMergeModalOpen && itemToMerge && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4" aria-modal="true" role="dialog">
                    <div className="bg-gray-950 rounded-lg shadow-xl p-5 w-full max-w-md border border-secondary-default/30">
                        <h2 className="text-lg font-semibold mb-4 text-white flex items-center gap-2">
                            <GitMerge size={20} />
                            Merge &quot;{itemToMerge.name}&quot;
                        </h2>
                        <p className="text-sm text-white/70 mb-4">
                            All transactions assigned to this category will move to the target.
                            This category will be soft-deleted.
                        </p>

                        {modalError && (
                            <div className="mb-3 p-2 bg-red-900/30 text-red-300 border border-red-600/50 rounded text-sm flex items-center gap-2">
                                <AlertCircle size={16} className="flex-shrink-0" />
                                <span>{modalError}</span>
                            </div>
                        )}

                        <label htmlFor="mergeTargetSelect" className="block text-sm font-medium text-white/80 mb-1">
                            Merge into
                        </label>
                        <select
                            id="mergeTargetSelect"
                            value={mergeTargetId}
                            onChange={(e) => setMergeTargetId(e.target.value)}
                            disabled={isSubmitting}
                            className="w-full px-3 py-2 bg-black/50 border border-secondary-default/40 rounded focus:outline-none focus:ring-2 focus:ring-secondary-default text-white cursor-pointer"
                        >
                            <option value="">Select a category...</option>
                            {mergeTargetOptions.map((cat) => (
                                <option key={cat.id} value={cat.id}>
                                    {cat.parent_category_id
                                        ? `${categories.find((p) => p.id === cat.parent_category_id)?.name ?? 'Parent'} › ${cat.name}`
                                        : cat.name}
                                </option>
                            ))}
                        </select>

                        <div className="flex justify-end gap-3 mt-5">
                            <button
                                type="button"
                                onClick={closeMergeModal}
                                disabled={isSubmitting}
                                className="px-4 py-2 bg-gray-700 text-white/80 rounded hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={confirmMerge}
                                disabled={isSubmitting || !mergeTargetId}
                                className="px-4 py-2 bg-amber-700 text-white rounded hover:bg-amber-800 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center min-w-[100px] transition-colors cursor-pointer"
                            >
                                {isSubmitting ? (
                                    <Loader2 className="animate-spin h-5 w-5" />
                                ) : (
                                    'Merge'
                                )}
                            </button>
                        </div>
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
                            {(() => {
                                const deleteWarning = categoryDeleteUsageWarning(itemToDelete);
                                return deleteWarning ? (
                                    <span className="block mt-2 text-sm text-yellow-400">
                                        {deleteWarning}
                                    </span>
                                ) : null;
                            })()}
                            {isMainCategoryDelete && (
                                <span className="block mt-2 text-sm text-white/60">
                                    Active subcategories will also be soft-deleted.
                                </span>
                            )}
                            <span className="block mt-3 text-sm text-white/60">
                                This is a soft delete. Turn on Show Deleted to restore it later.
                            </span>
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
