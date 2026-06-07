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
	GripVertical,
	GitMerge,
	FolderOpen,
} from 'lucide-react';
import { EmptyState } from '@/components/layout/EmptyState';
import { InlineAlert } from '@/components/layout/InlineAlert';
import { PageHeader } from '@/components/layout/PageHeader';
import { PageLoadingState } from '@/components/layout/PageLoadingState';
import { PageShell } from '@/components/layout/PageShell';
import { SearchInput } from '@/components/layout/SearchInput';
import { Modal } from '@/components/layout/Modal';
import {
	buttonDangerClass,
	buttonOutlineClass,
	buttonPrimaryClass,
	buttonWarningClass,
	glassCardClass,
	inputDarkClass,
} from '@/components/layout/tokens';
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
    const listError = error ?? categoriesError;

    return (
        <PageShell>
            <PageHeader
                title="Categories"
                subtitle="Organize spending and income into parent and sub categories."
                actions={
                    <>
                        <ToggleSwitch
                            checked={showDeleted}
                            onChange={setShowDeleted}
                            label="Show Deleted"
                            icons={{
                                on: <Eye size={16} />,
                                off: <EyeOff size={16} />,
                            }}
                        />
                        <SearchInput
                            value={searchQuery}
                            onChange={setSearchQuery}
                            placeholder="Search categories…"
                            className="w-full sm:max-w-xs"
                        />
                        <button
                            onClick={() => openModal('addMain')}
                            disabled={isSubmitting}
                            className={buttonOutlineClass}
                        >
                            <Plus size={18} className="mr-2" />
                            Add main category
                        </button>
                    </>
                }
            />

            {categoriesLoading && categories.length === 0 ? (
                <PageLoadingState
                    label="Loading categories…"
                    fullScreen={false}
                />
            ) : null}

            {uncategorized !== null && uncategorized.line_count > 0 ? (
                <InlineAlert variant="warning" className="mb-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <span title="Individual lines imported from your bank statements">
                            {uncategorizedBannerText(uncategorized)}
                        </span>
                        <NavLink
                            to="/transactions?uncategorized=1"
                            className="inline-flex items-center gap-1 whitespace-nowrap text-sm text-amber-200 hover:text-white"
                        >
                            Review on Transactions
                            <ArrowRight size={14} />
                        </NavLink>
                    </div>
                </InlineAlert>
            ) : null}

            {listError ? (
                <InlineAlert
                    variant="error"
                    className="mb-4"
                    onDismiss={() => setError(null)}
                >
                    {listError}
                </InlineAlert>
            ) : null}

            {!categoriesLoading && categories.length === 0 && !listError ? (
                <EmptyState
                    icon={FolderOpen}
                    title={
                        showDeleted
                            ? 'No categories found'
                            : 'No categories yet'
                    }
                    description={
                        showDeleted
                            ? 'No categories (including deleted) match.'
                            : 'Add a main category to get started.'
                    }
                    compact
                />
            ) : null}

            {!categoriesLoading && categories.length > 0 && mainCategories.length === 0 ? (
                <EmptyState
                    icon={FolderOpen}
                    title="No matches"
                    description="No categories match your search."
                    compact
                />
            ) : null}

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
                                glassCardClass,
                                "overflow-hidden transition-opacity",
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


            <Modal
                open={isModalOpen}
                onClose={closeModal}
                closeDisabled={isSubmitting}
                title={
                    modalMode === 'addMain'
                        ? 'Add New Main Category'
                        : modalMode === 'editMain'
                          ? 'Edit Main Category'
                          : modalMode === 'addSub'
                            ? `Add Subcategory to "${parentCategory?.name}"`
                            : 'Edit Subcategory'
                }
            >
                {modalError ? (
                    <InlineAlert variant="error" className="mb-4">
                        {modalError}
                    </InlineAlert>
                ) : null}
                <form onSubmit={handleModalSubmit}>
                    <div className="mb-4">
                        <label htmlFor="categoryNameInput" className="mb-1 block text-sm font-medium text-white/80">
                            {modalMode === 'addSub' || modalMode === 'editSub' ? 'Subcategory Name' : 'Category Name'}
                        </label>
                        <input
                            type="text"
                            id="categoryNameInput"
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            required
                            className={cn(inputDarkClass, 'w-full px-3 py-2')}
                            placeholder={modalMode === 'addSub' || modalMode === 'editSub' ? 'Enter subcategory name' : 'Enter category name'}
                            disabled={isSubmitting}
                        />
                    </div>
                    <div className="mb-4">
                        <label htmlFor="categoryDescriptionInput" className="mb-1 block text-sm font-medium text-white/80">
                            Description (optional)
                        </label>
                        <textarea
                            id="categoryDescriptionInput"
                            value={inputDescription}
                            onChange={(e) => setInputDescription(e.target.value)}
                            rows={3}
                            className={cn(inputDarkClass, 'min-h-[4.5rem] w-full resize-y px-3 py-2')}
                            placeholder="What kinds of transactions belong here?"
                            disabled={isSubmitting}
                        />
                    </div>
                    <div className="mb-4">
                        <label htmlFor="categoryColourInput" className="mb-1 block text-sm font-medium text-white/80">
                            Category Colour
                        </label>
                        <input
                            type="color"
                            id="categoryColourInput"
                            value={inputColour}
                            onChange={(e) => setInputColour(e.target.value)}
                            className={cn(inputDarkClass, 'h-10 w-full cursor-pointer px-1 py-1')}
                            disabled={isSubmitting}
                        />
                    </div>
                    <div className="flex justify-end gap-3">
                        <button type="button" onClick={closeModal} disabled={isSubmitting} className={buttonOutlineClass}>
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting || !inputValue.trim()}
                            className={cn(buttonPrimaryClass, 'min-w-[80px]')}
                        >
                            {isSubmitting ? (
                                <Loader2 className="h-5 w-5 animate-spin" />
                            ) : (modalMode === 'addMain' || modalMode === 'addSub') ? (
                                'Add'
                            ) : (
                                'Save'
                            )}
                        </button>
                    </div>
                </form>
            </Modal>

            <Modal
                open={isMergeModalOpen && itemToMerge !== null}
                onClose={closeMergeModal}
                closeDisabled={isSubmitting}
                title={
                    <span className="inline-flex items-center gap-2">
                        <GitMerge size={20} />
                        Merge &quot;{itemToMerge?.name}&quot;
                    </span>
                }
                description="All transactions assigned to this category will move to the target. This category will be soft-deleted."
                footer={
                    <>
                        <button type="button" onClick={closeMergeModal} disabled={isSubmitting} className={buttonOutlineClass}>
                            Cancel
                        </button>
                        <button
                            type="button"
                            onClick={confirmMerge}
                            disabled={isSubmitting || !mergeTargetId}
                            className={cn(buttonWarningClass, 'min-w-[100px]')}
                        >
                            {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Merge'}
                        </button>
                    </>
                }
            >
                {modalError ? (
                    <InlineAlert variant="error" className="mb-4">
                        {modalError}
                    </InlineAlert>
                ) : null}
                <label htmlFor="mergeTargetSelect" className="mb-1 block text-sm font-medium text-white/80">
                    Merge into
                </label>
                <select
                    id="mergeTargetSelect"
                    value={mergeTargetId}
                    onChange={(e) => setMergeTargetId(e.target.value)}
                    disabled={isSubmitting}
                    className={cn(inputDarkClass, 'w-full cursor-pointer px-3 py-2')}
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
            </Modal>

            <Modal
                open={isDeleteModalOpen && itemToDelete !== null}
                onClose={closeDeleteModal}
                closeDisabled={isSubmitting}
                title={
                    <span className="inline-flex items-center gap-2 text-red-400">
                        <AlertCircle size={20} />
                        Confirm Deletion
                    </span>
                }
                footer={
                    <>
                        <button type="button" onClick={closeDeleteModal} disabled={isSubmitting} className={buttonOutlineClass}>
                            Cancel
                        </button>
                        <button
                            type="button"
                            onClick={confirmDelete}
                            disabled={isSubmitting}
                            className={cn(buttonDangerClass, 'min-w-[120px]')}
                        >
                            {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Confirm Delete'}
                        </button>
                    </>
                }
            >
                <p className="text-white/80">
                    Are you sure you want to delete the category{' '}
                    <strong className="text-white">&quot;{itemToDelete?.name}&quot;</strong>?
                    {itemToDelete ? (() => {
                        const deleteWarning = categoryDeleteUsageWarning(itemToDelete);
                        return deleteWarning ? (
                            <span className="mt-2 block text-sm text-yellow-400">
                                {deleteWarning}
                            </span>
                        ) : null;
                    })() : null}
                    {isMainCategoryDelete ? (
                        <span className="mt-2 block text-sm text-white/60">
                            Active subcategories will also be soft-deleted.
                        </span>
                    ) : null}
                    <span className="mt-3 block text-sm text-white/60">
                        This is a soft delete. Turn on Show Deleted to restore it later.
                    </span>
                </p>
                {error ? (
                    <InlineAlert variant="error" className="mt-4">
                        {error}
                    </InlineAlert>
                ) : null}
            </Modal>

        </PageShell>
    );
};
