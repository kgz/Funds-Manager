import { useState, useEffect, FormEvent, DragEvent, ReactNode, useRef } from 'react';
import {
	Loader2,
	ChevronDown,
	ChevronRight,
	AlertTriangle,
	GitMerge,
	FolderOpen,
	Pencil,
	Trash2,
	Lock,
	RotateCcw,
	Check,
	X,
} from 'lucide-react';
import { EmptyState } from '@/components/layout/EmptyState';
import { InlineAlert } from '@/components/layout/InlineAlert';
import { PageLoadingState } from '@/components/layout/PageLoadingState';
import { PageShell } from '@/components/layout/PageShell';
import { SearchInput } from '@/components/layout/SearchInput';
import { Modal } from '@/components/layout/Modal';
import { ToggleSwitch } from '@/components/layout/ToggleSwitch';
import { AccountFilter } from '@/components/account-filter';
import { useAccountFilter } from '@/hooks/useAccountFilter';
import {
	buttonOutlineClass,
	buttonWarningClass,
	glassCardClass,
	inputDarkClass,
	pageActionsClass,
	pageBodyClass,
	pageHeaderClass,
	pageSubtitleClass,
	pageTitleClass,
	panelHintClass,
	panelTitleClass,
	eyebrowClass,
} from '@/components/layout/tokens';
import { cn } from '@/lib/utils/cn';
import { normalizeCategoryColour } from '@/lib/contrastTextColor';
import { CategoryPill } from '@/components/CategoryPill';
import { useAppDispatch, useAppSelector } from '@/store/store';
import { getAllCategories, type Category } from '@/store/thunks/category.get.all';
import { createCategory } from '@/store/thunks/category.create.single';
import { updateCategory } from '@/store/thunks/category.update.single';
import { deleteCategory } from '@/store/thunks/category.delete.single';
import { restoreCategory } from '@/store/thunks/category.restore.single';
import { mergeCategory } from '@/store/thunks/category.merge.single';
import { reorderCategories } from '@/store/thunks/category.reorder';
import { readThunkRejectMessage } from '@/lib/utils/thunkError';
import { uncategorizedBannerText } from '@/lib/utils/categoryUsage';
import {
	readExpandedCategoryIds,
	writeExpandedCategoryIds,
} from '@/lib/utils/categoryExpandStorage';
import {
	shouldExpandForSearch,
	visibleMainCategories,
	visibleSubcategories,
} from '@/lib/utils/categoryFilter';
import { randomCategoryColour } from '@/lib/categoryColour';
import {
	formatDeletedLabel,
	isSystemCategory,
	sortCategoriesDeletedLast,
} from '@/lib/utils/categorySystem';
import { NavLink } from 'react-router';

type CategoryToast = {
	message: string;
	icon?: 'check' | 'restore';
	onUndo?: () => void;
};

const catBtnClass =
	'inline-flex h-8 cursor-pointer items-center justify-center gap-1.5 rounded-paper border border-paper-border bg-paper-surface px-3 text-[13px] font-medium tracking-[0.02em] text-paper-fg transition-colors hover:bg-[color-mix(in_oklch,var(--fg)_3%,var(--surface))] disabled:cursor-not-allowed disabled:opacity-50';

const catBtnPrimaryClass =
	'inline-flex h-8 cursor-pointer items-center justify-center gap-1.5 rounded-paper border border-paper-fg bg-paper-fg px-3 text-[13px] font-medium tracking-[0.02em] !text-white transition-colors hover:bg-[color-mix(in_oklch,var(--fg)_88%,white)] disabled:cursor-not-allowed disabled:opacity-50';

const catBtnGhostClass =
	'inline-flex h-7 cursor-pointer items-center justify-center rounded-paper border border-transparent bg-transparent px-2 text-xs font-medium text-paper-muted transition-colors hover:bg-[color-mix(in_oklch,var(--fg)_4%,transparent)] hover:text-paper-fg disabled:cursor-not-allowed disabled:opacity-50';

const dragHandleClass =
	'cursor-grab select-none text-sm leading-none tracking-tighter text-paper-muted active:cursor-grabbing';

const treeItemClass =
	'grid grid-cols-[20px_1fr_auto] items-center gap-2 rounded-paper border border-transparent px-2.5 py-2 transition-colors hover:border-paper-border hover:bg-[color-mix(in_oklch,var(--fg)_2.5%,transparent)]';

const treeItemDeletedClass =
	'bg-[color-mix(in_oklch,var(--fg)_1.5%,transparent)] opacity-[0.72]';

const iconBtnClass =
	'inline-grid h-7 w-7 shrink-0 place-items-center rounded-paper border-0 bg-transparent text-paper-muted transition-colors hover:bg-[color-mix(in_oklch,var(--fg)_4%,transparent)] hover:text-paper-fg disabled:cursor-default disabled:opacity-70';

const iconBtnDangerClass =
	'hover:bg-[color-mix(in_oklch,var(--danger)_10%,transparent)] hover:text-[var(--danger)]';

const restoreBtnClass =
	'inline-flex h-[26px] cursor-pointer items-center gap-1 rounded-paper border border-[color-mix(in_oklch,var(--success)_35%,var(--border))] bg-[color-mix(in_oklch,var(--success)_7%,var(--surface))] px-2.5 text-xs font-medium text-[var(--success)] transition-colors hover:bg-[color-mix(in_oklch,var(--success)_14%,var(--surface))] disabled:cursor-not-allowed disabled:opacity-50';

const deletedPillClass =
	'inline-flex h-[18px] shrink-0 items-center rounded-full border border-[color-mix(in_oklch,var(--danger)_30%,var(--border))] bg-[color-mix(in_oklch,var(--danger)_7%,var(--surface))] px-1.5 text-[9.5px] font-semibold uppercase tracking-wider text-[var(--danger)]';

const deletedCountBadgeClass =
	'inline-grid min-h-[17px] min-w-[17px] place-items-center rounded-full border border-paper-border bg-paper px-1 font-mono text-[10.5px] font-medium text-paper-muted';

const categoryDialogClass =
	'fixed inset-0 m-auto h-fit w-[min(440px,calc(100vw-32px))] max-h-[min(560px,calc(100vh-48px))] overflow-hidden rounded-[10px] border border-paper-border bg-paper-surface p-0 shadow-[0_16px_48px_color-mix(in_oklch,var(--fg)_12%,transparent)] backdrop:bg-paper-fg/35 backdrop:backdrop-blur-sm [&:not([open])]:hidden';

const categoryDialogBtnDangerClass =
	'inline-flex h-8 cursor-pointer items-center justify-center gap-1.5 rounded-paper border border-[color-mix(in_oklch,var(--danger)_38%,var(--border))] bg-[color-mix(in_oklch,var(--danger)_6%,var(--surface))] px-3 text-[13px] font-medium tracking-[0.02em] text-[var(--danger)] transition-colors hover:bg-[color-mix(in_oklch,var(--danger)_14%,var(--surface))] disabled:cursor-not-allowed disabled:opacity-50';

const categoryModalBodyClass =
	'flex flex-col gap-3 px-[22px] pb-[18px] pt-3.5 text-[13px] leading-[1.55] text-paper-fg [&_p]:m-0';

const categoryModalNoteClass =
	'rounded-paper border border-[color-mix(in_oklch,var(--warn)_35%,var(--border))] bg-[color-mix(in_oklch,var(--warn)_8%,var(--surface))] px-2.5 py-2 text-xs leading-normal text-paper-fg';

const categoryChildListClass =
	'm-0 list-disc pl-[18px] text-[12.5px] text-paper-muted [&_li]:mb-[3px]';

const categoryModalFieldClass = 'flex flex-col gap-1.5';

const categoryModalFieldLabelClass =
	'text-[11px] font-medium uppercase tracking-[0.04em] text-paper-muted';

const categoryFormErrorClass =
	'm-0 rounded-paper border border-[color-mix(in_oklch,var(--danger)_30%,var(--border))] bg-[color-mix(in_oklch,var(--danger)_7%,var(--surface))] px-2.5 py-2 text-xs text-[var(--danger)]';

function isCategoryRowChromeTarget(target: EventTarget | null): boolean {
	if (!(target instanceof HTMLElement)) {
		return false;
	}
	return Boolean(
		target.closest('[data-category-checkbox]') ||
			target.closest('[data-category-row-action]') ||
			target.closest('[data-category-drag-handle]')
	);
}

type CategoryPreviewProps = {
	name: string;
	colour: string;
};

function CategoryPreview({ name, colour }: CategoryPreviewProps) {
	return (
		<div className="flex items-center gap-2 rounded-paper border border-paper-border bg-paper px-2.5 py-2 font-medium text-paper-fg">
			<span
				className="h-2 w-2 shrink-0 rounded-full"
				style={{ backgroundColor: normalizeCategoryColour(colour) }}
				aria-hidden
			/>
			{name}
		</div>
	);
}

const colorSwatchClass =
	'h-[18px] w-[18px] shrink-0 cursor-pointer rounded border border-[color-mix(in_oklch,var(--fg)_10%,transparent)] p-0';

type CategoryColorSwatchProps = {
	value: string;
	label: string;
	disabled?: boolean;
	onChange: (colour: string) => void;
};

function CategoryColorSwatch({
	value,
	label,
	disabled = false,
	onChange,
}: CategoryColorSwatchProps) {
	const inputRef = useRef<HTMLInputElement>(null);
	const displayColour = normalizeCategoryColour(value);

	return (
		<>
			<button
				type="button"
				disabled={disabled}
				className={colorSwatchClass}
				style={{ backgroundColor: displayColour }}
				aria-label={label}
				onClick={() => inputRef.current?.click()}
			/>
			<input
				ref={inputRef}
				type="color"
				className="sr-only"
				value={displayColour}
				disabled={disabled}
				onChange={(event) => onChange(event.target.value)}
			/>
		</>
	);
}

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
    const [inputColour, setInputColour] = useState<string>(randomCategoryColour());

    const [searchQuery, setSearchQuery] = useState('');
    const [draggingId, setDraggingId] = useState<string | null>(null);
    const [selectedCategoryIds, setSelectedCategoryIds] = useState<Set<string>>(new Set());
    const [bulkMergeTargetId, setBulkMergeTargetId] = useState('');
    const [isBulkMergeOpen, setIsBulkMergeOpen] = useState(false);

    // Delete Modal State
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [itemToDelete, setItemToDelete] = useState<Category | null>(null);
    const [deleteBlockedChildren, setDeleteBlockedChildren] = useState<Category[]>([]);
    const [editParentId, setEditParentId] = useState('');
    const [toast, setToast] = useState<CategoryToast | null>(null);
    const [showEditNameError, setShowEditNameError] = useState(false);
    const deleteDialogRef = useRef<HTMLDialogElement>(null);
    const editDialogRef = useRef<HTMLDialogElement>(null);
    const addDialogRef = useRef<HTMLDialogElement>(null);
    const editNameInputRef = useRef<HTMLInputElement>(null);

    // View State
    const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
        () => readExpandedCategoryIds()
    );
    const [showDeleted, setShowDeleted] = useState(false);

	const { categories, categoriesError, categoriesLoading, uncategorized } =
		useAppSelector((state) => state.CategoryReducer);
	const dispatch = useAppDispatch();
	const { accountIdNumber } = useAccountFilter();

    const reloadCategories = () => {
        void dispatch(getAllCategories({ withCounts: true, accountId: accountIdNumber }));
    };

    useEffect(() => {
        reloadCategories();
    }, [accountIdNumber]);

    useEffect(() => {
        if (!toast) {
            return;
        }
        const timer = window.setTimeout(() => setToast(null), 4200);
        return () => window.clearTimeout(timer);
    }, [toast]);

    useEffect(() => {
        const dialog = deleteDialogRef.current;
        if (dialog === null) {
            return;
        }
        if (isDeleteModalOpen && itemToDelete !== null && !dialog.open) {
            dialog.showModal();
        } else if ((!isDeleteModalOpen || itemToDelete === null) && dialog.open) {
            dialog.close();
        }
    }, [isDeleteModalOpen, itemToDelete]);

    const isEditModal = modalMode === 'editMain' || modalMode === 'editSub';
    const isAddModal = modalMode === 'addMain' || modalMode === 'addSub';

    useEffect(() => {
        const dialog = editDialogRef.current;
        if (dialog === null) {
            return;
        }
        if (isModalOpen && isEditModal && !dialog.open) {
            dialog.showModal();
            requestAnimationFrame(() => {
                editNameInputRef.current?.focus();
                editNameInputRef.current?.select();
            });
        } else if ((!isModalOpen || !isEditModal) && dialog.open) {
            dialog.close();
        }
    }, [isModalOpen, isEditModal]);

    useEffect(() => {
        const dialog = addDialogRef.current;
        if (dialog === null) {
            return;
        }
        if (isModalOpen && isAddModal && !dialog.open) {
            dialog.showModal();
        } else if ((!isModalOpen || !isAddModal) && dialog.open) {
            dialog.close();
        }
    }, [isModalOpen, isAddModal]);

    const showToast = (next: CategoryToast) => {
        setToast(next);
    };

    // --- Modal Handling ---
    const openModal = (mode: ModalMode, item?: Category, parent?: Category) => {
        setModalMode(mode);
        setCurrentItem(item || null);
        setParentCategory(parent || null);
        setInputValue((mode === 'editMain' || mode === 'editSub') && item ? item.name : '');
        if ((mode === 'editMain' || mode === 'editSub') && item && 'colour' in item) {
            setInputColour(item.colour || randomCategoryColour());
            setEditParentId(item.parent_category_id ?? '');
        } else if (mode === 'addMain' || mode === 'addSub') {
            setInputColour(randomCategoryColour());
        } else {
            setInputColour('#ffffff'); // Fallback default (shouldn't be reached often)
        }
        setModalError(null);
        setShowEditNameError(false);
        setIsModalOpen(true);
    };

    const closeModal = () => {
        if (isSubmitting) return;
        setIsModalOpen(false);
        setInputValue('');
        setCurrentItem(null);
        setParentCategory(null);
        setEditParentId('');
        setInputColour('#ffffff');
        setModalError(null);
        setShowEditNameError(false);
    };

    // --- Delete Modal Handling ---
    const openDeleteModal = (item: Category) => {
        const activeChildren = categories.filter(
            (category) =>
                category.parent_category_id === item.id && !category.deleted_at
        );
        setItemToDelete(item);
        setDeleteBlockedChildren(activeChildren);
        setIsDeleteModalOpen(true);
    };

    const closeDeleteModal = () => {
        if (isSubmitting) return;
        setIsDeleteModalOpen(false);
        setItemToDelete(null);
        setDeleteBlockedChildren([]);
    };

    // --- CRUD Handlers ---
    const handleAddSubmit = async (event: FormEvent) => {
        event.preventDefault();
        const trimmedValue = inputValue.trim();
        if (!trimmedValue) {
            setModalError('Name cannot be empty.');
            return;
        }
        setIsSubmitting(true);
        setModalError(null);
        try {
            if (modalMode === 'addMain') {
                await dispatch(
                    createCategory({
                        name: trimmedValue,
                        description: null,
                        colour: inputColour,
                    })
                ).unwrap();
            } else if (modalMode === 'addSub' && parentCategory) {
                await dispatch(
                    createCategory({
                        name: trimmedValue,
                        description: null,
                        parent_category_id: parentCategory.id,
                        colour: inputColour,
                    })
                ).unwrap();
            }
            closeModal();
            reloadCategories();
        } catch (err) {
            setModalError(readThunkRejectMessage(err, 'Failed to save category'));
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleEditSubmit = async (event: FormEvent) => {
        event.preventDefault();
        const trimmedValue = inputValue.trim();
        if (!trimmedValue) {
            setShowEditNameError(true);
            return;
        }
        if (!currentItem) {
            return;
        }
        setIsSubmitting(true);
        setModalError(null);
        setShowEditNameError(false);
        try {
            const updatePayload: Partial<Category> & { id: Category['id'] } = {
                id: currentItem.id,
                name: trimmedValue,
                description: currentItem.description ?? null,
                colour: currentItem.colour ?? randomCategoryColour(),
            };
            if (modalMode === 'editSub' && editParentId) {
                updatePayload.parent_category_id = editParentId;
            }
            await dispatch(updateCategory(updatePayload)).unwrap();
            closeModal();
            reloadCategories();
            showToast({ message: `“${trimmedValue}” updated.` });
        } catch (err) {
            setModalError(readThunkRejectMessage(err, 'Failed to save category'));
        } finally {
            setIsSubmitting(false);
        }
    };

    const confirmDelete = async () => {
        if (!itemToDelete || deleteBlockedChildren.length > 0) return;
        const deletedName = itemToDelete.name;
        const deletedId = itemToDelete.id;
        setIsSubmitting(true);
        setError(null);
        try {
			await dispatch(deleteCategory(Number(deletedId))).unwrap();
            closeDeleteModal();
            reloadCategories();
            showToast({
                message: `“${deletedName}” deleted — moved to Deleted categories.`,
                onUndo: () => {
                    void dispatch(restoreCategory(Number(deletedId)))
                        .unwrap()
                        .then(() => {
                            reloadCategories();
                            showToast({
                                message: `“${deletedName}” restored.`,
                                icon: 'restore',
                            });
                        })
                        .catch((err: unknown) => {
                            setError(readThunkRejectMessage(err, 'Failed to restore category'));
                        });
                },
            });
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
            showToast({
                message: `“${itemToRestore.name}” restored.`,
                icon: 'restore',
            });
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

    const toggleCategorySelected = (categoryId: string) => {
        setSelectedCategoryIds((previous) => {
            const next = new Set(previous);
            if (next.has(categoryId)) {
                next.delete(categoryId);
            } else {
                next.add(categoryId);
            }
            return next;
        });
    };

    const openBulkMergeModal = () => {
        if (selectedCategoryIds.size < 2) {
            setError('Select at least two categories to merge.');
            return;
        }
        setBulkMergeTargetId('');
        setModalError(null);
        setIsBulkMergeOpen(true);
    };

    const closeBulkMergeModal = () => {
        if (isSubmitting) return;
        setIsBulkMergeOpen(false);
        setBulkMergeTargetId('');
        setModalError(null);
    };

    const confirmBulkMerge = async () => {
        if (!bulkMergeTargetId || selectedCategoryIds.size < 2) return;
        const sources = [...selectedCategoryIds].filter((id) => id !== bulkMergeTargetId);
        if (sources.length === 0) return;

        setIsSubmitting(true);
        setModalError(null);
        setError(null);
        try {
            for (const sourceId of sources) {
                await dispatch(
                    mergeCategory({
                        sourceId,
                        targetCategoryId: bulkMergeTargetId,
                    })
                ).unwrap();
            }
            setSelectedCategoryIds(new Set());
            closeBulkMergeModal();
            reloadCategories();
        } catch (err) {
            setModalError(readThunkRejectMessage(err, 'Failed to merge categories'));
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleInlineColourChange = async (category: Category, colour: string) => {
        if (isSubmitting || category.deleted_at) return;
        setIsSubmitting(true);
        setError(null);
        try {
            await dispatch(
                updateCategory({
                    id: category.id,
                    name: category.name,
                    description: category.description ?? null,
                    colour,
                })
            ).unwrap();
            reloadCategories();
        } catch (err) {
            setError(readThunkRejectMessage(err, 'Failed to update colour'));
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

    const mainCategories = sortCategoriesDeletedLast(
        visibleMainCategories(categories, searchQuery, showDeleted)
    );

    const topLevelParentOptions = categories.filter(
        (category) =>
            !category.parent_category_id &&
            !category.deleted_at &&
            !isSystemCategory(category)
    );

    const bulkMergeTargetOptions = categories.filter(
        (cat) => !cat.deleted_at && !selectedCategoryIds.has(cat.id)
    );

    const activeCategoryCount = categories.filter((category) => !category.deleted_at).length;
    const deletedCategoryCount = categories.filter((category) => category.deleted_at).length;

    const renderRowActions = (
        category: Category,
        isMain: boolean,
        parent?: Category | null
    ) => {
        if (category.deleted_at) {
            if (!showDeleted) {
                return <span aria-hidden />;
            }
            return (
                <button
                    type="button"
                    data-category-row-action
                    onClick={() => void handleRestore(category)}
                    disabled={isSubmitting}
                    className={restoreBtnClass}
                >
                    {isSubmitting ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                        <RotateCcw size={14} />
                    )}
                    Restore
                </button>
            );
        }

        const system = isSystemCategory(category);

        return (
            <div className="flex items-center gap-1" data-category-row-action>
                <CategoryColorSwatch
                    value={category.colour ?? '#888888'}
                    label={`Colour for ${category.name}`}
                    disabled={isSubmitting}
                    onChange={(colour) => void handleInlineColourChange(category, colour)}
                />
                {isMain ? (
                    <button
                        type="button"
                        className={catBtnGhostClass}
                        onClick={() => openModal('addSub', undefined, category)}
                        disabled={isSubmitting}
                    >
                        + Sub
                    </button>
                ) : null}
                {!system ? (
                    <button
                        type="button"
                        className={iconBtnClass}
                        title="Edit category"
                        aria-label={`Edit ${category.name}`}
                        onClick={() => openEditModal(category, parent)}
                        disabled={isSubmitting}
                    >
                        <Pencil size={14} />
                    </button>
                ) : null}
                {system ? (
                    <button
                        type="button"
                        className={cn(iconBtnClass, 'cursor-default hover:bg-transparent hover:text-paper-muted')}
                        title="System category — can't be deleted"
                        aria-label="System category, cannot be deleted"
                        disabled
                    >
                        <Lock size={14} />
                    </button>
                ) : (
                    <button
                        type="button"
                        className={cn(iconBtnClass, iconBtnDangerClass)}
                        title="Delete category"
                        aria-label={`Delete ${category.name}`}
                        onClick={() => openDeleteModal(category)}
                        disabled={isSubmitting}
                    >
                        <Trash2 size={15} />
                    </button>
                )}
            </div>
        );
    };

    const renderDeletedLabel = (category: Category) => (
        <div className="flex min-w-0 items-center gap-2 overflow-hidden">
            <span
                className="h-[18px] w-[18px] shrink-0 rounded border border-[color-mix(in_oklch,var(--fg)_10%,transparent)] opacity-50"
                style={{ backgroundColor: normalizeCategoryColour(category.colour ?? '#888888') }}
                aria-hidden
            />
            <span className="min-w-0 truncate text-[13px] text-paper-muted line-through decoration-paper-muted/55">
                {category.name}
            </span>
            <span className={deletedPillClass}>Deleted</span>
            {category.deleted_at ? (
                <span className="shrink-0 text-[11px] text-paper-muted">
                    {formatDeletedLabel(category.deleted_at)}
                </span>
            ) : null}
        </div>
    );

    const openEditModal = (category: Category, parent?: Category | null) => {
        if (category.deleted_at) {
            return;
        }
        const isMain = !category.parent_category_id;
        openModal(
            isMain ? 'editMain' : 'editSub',
            category,
            parent ?? undefined
        );
    };

    const renderSubcategoryRows = (
        parentId: string,
        mainCategory: Category
    ): ReactNode => {
        const subs = sortCategoriesDeletedLast(
            visibleSubcategories(categories, parentId, searchQuery, showDeleted)
        );

        return subs.map((sub) => {
            const isSubDeleted = !!sub.deleted_at;
            const parent = categories.find((item) => item.id === sub.parent_category_id);
            const childCategories = sortCategoriesDeletedLast(
                visibleSubcategories(categories, sub.id, searchQuery, showDeleted)
            );
            const hasChildren = childCategories.length > 0;
            const isExpanded =
                expandedCategories.has(sub.id) ||
                shouldExpandForSearch(categories, sub.id, searchQuery, showDeleted);

            return (
                <li key={sub.id} role="none">
                    <div
                        role="treeitem"
                        className={cn(
                            treeItemClass,
                            isSubDeleted && treeItemDeletedClass,
                            draggingId === sub.id && 'opacity-50',
                            hasChildren && !isSubDeleted && 'cursor-pointer'
                        )}
                        onClick={(event) => {
                            if (isSubDeleted || !hasChildren) {
                                return;
                            }
                            if (isCategoryRowChromeTarget(event.target)) {
                                return;
                            }
                            toggleExpand(sub.id);
                        }}
                        onDragOver={(event) => {
                            if (!isSubDeleted) event.preventDefault();
                        }}
                        onDrop={(event) => {
                            event.preventDefault();
                            if (!isSubDeleted && sub.parent_category_id) {
                                handleSubDrop(sub.parent_category_id, sub.id);
                            }
                        }}
                    >
                        {!isSubDeleted ? (
                            <button
                                type="button"
                                data-category-drag-handle
                                draggable
                                onDragStart={(event) => onDragStart(event, sub.id)}
                                onDragEnd={onDragEnd}
                                className={dragHandleClass}
                                title="Drag to reorder"
                                aria-hidden
                            >
                                ⋮⋮
                            </button>
                        ) : (
                            <span className={cn(dragHandleClass, 'invisible')} aria-hidden>
                                ⋮⋮
                            </span>
                        )}
                        {isSubDeleted ? (
                            renderDeletedLabel(sub)
                        ) : (
                            <div className="flex min-w-0 items-center gap-2">
                                <input
                                    type="checkbox"
                                    data-category-checkbox
                                    checked={selectedCategoryIds.has(sub.id)}
                                    onChange={() => toggleCategorySelected(sub.id)}
                                    onClick={(event) => event.stopPropagation()}
                                    aria-label={`Select ${sub.name}`}
                                    className="shrink-0"
                                />
                                <span className="flex min-w-0 items-center gap-1">
                                    {hasChildren ? (
                                        <span className="shrink-0 text-paper-muted" aria-hidden>
                                            {isExpanded ? (
                                                <ChevronDown size={16} />
                                            ) : (
                                                <ChevronRight size={16} />
                                            )}
                                        </span>
                                    ) : (
                                        <span className="inline-block w-4 shrink-0" />
                                    )}
                                    <span className="min-w-0 truncate text-[13px] text-paper-fg">
                                        {sub.name}
                                    </span>
                                    {hasChildren ? (
                                        <span className="shrink-0 text-xs font-normal text-paper-muted">
                                            ({childCategories.length} sub)
                                        </span>
                                    ) : null}
                                </span>
                            </div>
                        )}
                        {renderRowActions(sub, false, parent ?? mainCategory)}
                    </div>
                    {hasChildren && isExpanded ? (
                        <ul
                            className="m-0 mb-1 ml-7 list-none border-l border-paper-border p-0"
                            role="group"
                        >
                            {renderSubcategoryRows(sub.id, mainCategory)}
                        </ul>
                    ) : null}
                </li>
            );
        });
    };

    // --- Render Logic ---
    const listError = error ?? categoriesError;

    if (categoriesLoading && categories.length === 0) {
        return <PageLoadingState label="Loading categories…" />;
    }

    return (
        <PageShell variant="table">
            <header className={pageHeaderClass}>
                <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                            <h1 className={pageTitleClass}>Categories</h1>
                            {categoriesLoading ? (
                                <Loader2
                                    className="h-4 w-4 animate-spin text-secondary-default"
                                    aria-label="Loading"
                                />
                            ) : null}
                        </div>
                        <p className={pageSubtitleClass}>
                            Parent / sub tree · drag to reorder · merge duplicates
                        </p>
                    </div>
                    <div className={pageActionsClass}>
                        <button
                            type="button"
                            className={catBtnClass}
                            disabled={isSubmitting || selectedCategoryIds.size < 2}
                            onClick={openBulkMergeModal}
                        >
                            {selectedCategoryIds.size >= 2
                                ? `Merge selected (${selectedCategoryIds.size})`
                                : 'Merge selected'}
                        </button>
                        <button
                            type="button"
                            className={catBtnPrimaryClass}
                            disabled={isSubmitting}
                            onClick={() => openModal('addMain')}
                        >
                            New category
                        </button>
                    </div>
                </div>
            </header>

            <div className={pageBodyClass}>
                <div className="flex flex-col gap-6">
                    <div className="flex flex-wrap items-center gap-2.5">
                        <AccountFilter />
                        <SearchInput
                            value={searchQuery}
                            onChange={setSearchQuery}
                            placeholder="Search categories…"
                            className="w-full min-w-[12rem] sm:max-w-xs"
                        />
                    </div>

                    {uncategorized !== null && uncategorized.line_count > 0 ? (
                        <div
                            role="status"
                            className="flex items-start gap-2.5 rounded-paper border border-[color-mix(in_oklch,var(--warn)_35%,var(--border))] bg-[color-mix(in_oklch,var(--warn)_8%,var(--surface))] px-3.5 py-3 text-[13px] text-paper-fg"
                        >
                            <AlertTriangle
                                className="mt-0.5 h-4 w-4 shrink-0 text-[color-mix(in_oklch,var(--warn)_80%,var(--fg))]"
                                strokeWidth={1.8}
                                aria-hidden
                            />
                            <div>
                                <strong className="font-semibold">Uncategorized transactions.</strong>{' '}
                                {uncategorizedBannerText(uncategorized)}{' '}
                                <NavLink
                                    to="/transactions?uncategorized=1"
                                    className="font-medium text-paper-fg underline decoration-paper-border hover:decoration-paper-fg"
                                >
                                    Review on Transactions
                                </NavLink>
                            </div>
                        </div>
                    ) : null}

                    {listError ? (
                        <InlineAlert variant="error" onDismiss={() => setError(null)}>
                            {listError}
                        </InlineAlert>
                    ) : null}

                    {!categoriesLoading && categories.length === 0 && !listError ? (
                        <EmptyState
                            icon={FolderOpen}
                            title={showDeleted ? 'No categories found' : 'No categories yet'}
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

                    {mainCategories.length > 0 ? (
                        <section className={cn(glassCardClass, 'overflow-hidden p-0')}>
                            <div className="flex items-center justify-between gap-3 border-b border-paper-border px-4 py-3.5">
                                <div className="min-w-0">
                                    <h2 className={panelTitleClass}>Category tree</h2>
                                    <p className={panelHintClass}>
                                        {activeCategoryCount} active{' '}
                                        {activeCategoryCount === 1 ? 'category' : 'categories'} ·
                                        colour chips drive transaction dots
                                    </p>
                                </div>
                                <label className="flex shrink-0 items-center gap-2 text-[13px] text-paper-muted">
                                    <ToggleSwitch
                                        checked={showDeleted}
                                        onChange={setShowDeleted}
                                        ariaLabel="Show deleted categories"
                                    />
                                    Show deleted
                                    {deletedCategoryCount > 0 ? (
                                        <span className={deletedCountBadgeClass}>
                                            {deletedCategoryCount}
                                        </span>
                                    ) : null}
                                </label>
                            </div>
                            <div className="px-2.5 py-2 pb-4">
                                <ul className="m-0 list-none p-0" role="tree" aria-label="Categories">
                                    {mainCategories.map((category) => {
                                        const isDeleted = !!category.deleted_at;
                                        const isExpanded =
                                            expandedCategories.has(category.id) ||
                                            shouldExpandForSearch(
                                                categories,
                                                category.id,
                                                searchQuery,
                                                showDeleted
                                            );
                                        const sub_categories = sortCategoriesDeletedLast(
                                            visibleSubcategories(
                                                categories,
                                                category.id,
                                                searchQuery,
                                                showDeleted
                                            )
                                        );

                                        return (
                                            <li key={category.id} role="none">
                                                <div
                                                    role="treeitem"
                                                    className={cn(
                                                        treeItemClass,
                                                        'font-medium',
                                                        isDeleted && treeItemDeletedClass,
                                                        draggingId === category.id && 'opacity-50',
                                                        sub_categories.length > 0 &&
                                                            !isDeleted &&
                                                            'cursor-pointer'
                                                    )}
                                                    onClick={(event) => {
                                                        if (
                                                            isDeleted ||
                                                            sub_categories.length === 0
                                                        ) {
                                                            return;
                                                        }
                                                        if (isCategoryRowChromeTarget(event.target)) {
                                                            return;
                                                        }
                                                        toggleExpand(category.id);
                                                    }}
                                                    onDragOver={(event) => {
                                                        if (!isDeleted) event.preventDefault();
                                                    }}
                                                    onDrop={(event) => {
                                                        event.preventDefault();
                                                        if (!isDeleted) handleMainDrop(category.id);
                                                    }}
                                                >
                                                    {!isDeleted ? (
                                                        <button
                                                            type="button"
                                                            data-category-drag-handle
                                                            draggable
                                                            onDragStart={(event) =>
                                                                onDragStart(event, category.id)
                                                            }
                                                            onDragEnd={onDragEnd}
                                                            className={dragHandleClass}
                                                            title="Drag to reorder"
                                                            aria-hidden
                                                        >
                                                            ⋮⋮
                                                        </button>
                                                    ) : (
                                                        <span className={cn(dragHandleClass, 'invisible')} aria-hidden>
                                                            ⋮⋮
                                                        </span>
                                                    )}
                                                    {isDeleted ? (
                                                        renderDeletedLabel(category)
                                                    ) : (
                                                        <div className="flex min-w-0 items-center gap-2">
                                                            <input
                                                                type="checkbox"
                                                                data-category-checkbox
                                                                checked={selectedCategoryIds.has(
                                                                    category.id
                                                                )}
                                                                onChange={() =>
                                                                    toggleCategorySelected(
                                                                        category.id
                                                                    )
                                                                }
                                                                onClick={(event) =>
                                                                    event.stopPropagation()
                                                                }
                                                                aria-label={`Select ${category.name}`}
                                                                className="shrink-0"
                                                            />
                                                            <span className="flex min-w-0 items-center gap-1">
                                                                {sub_categories.length > 0 ? (
                                                                    <span
                                                                        className="shrink-0 text-paper-muted"
                                                                        aria-hidden
                                                                    >
                                                                        {isExpanded ? (
                                                                            <ChevronDown size={16} />
                                                                        ) : (
                                                                            <ChevronRight size={16} />
                                                                        )}
                                                                    </span>
                                                                ) : (
                                                                    <span className="inline-block w-4 shrink-0" />
                                                                )}
                                                                <span className="min-w-0 truncate text-[13px] font-medium text-paper-fg">
                                                                    {category.name}
                                                                </span>
                                                                {sub_categories.length > 0 ? (
                                                                    <span className="shrink-0 text-xs font-normal text-paper-muted">
                                                                        ({sub_categories.length} sub)
                                                                    </span>
                                                                ) : null}
                                                            </span>
                                                        </div>
                                                    )}
                                                    {renderRowActions(category, true)}
                                                </div>
                                                {isExpanded && sub_categories.length > 0 ? (
                                                    <ul
                                                        className="m-0 mb-1 ml-7 list-none border-l border-paper-border p-0"
                                                        role="group"
                                                    >
                                                        {renderSubcategoryRows(
                                                            category.id,
                                                            category
                                                        )}
                                                    </ul>
                                                ) : null}
                                            </li>
                                        );
                                    })}
                                </ul>
                            </div>
                        </section>
                    ) : null}
                </div>
            </div>

            <dialog
                ref={editDialogRef}
                className={categoryDialogClass}
                aria-labelledby="edit-category-title"
                onCancel={(event) => {
                    event.preventDefault();
                    if (!isSubmitting) {
                        closeModal();
                    }
                }}
                onClose={closeModal}
            >
                <form className="flex min-h-0 flex-col" onSubmit={handleEditSubmit}>
                    <div className="flex items-start justify-between gap-3 px-[22px] pt-[18px]">
                        <div className="min-w-0">
                            <span className={cn(eyebrowClass, 'mb-1 block')}>Categories</span>
                            <h2
                                id="edit-category-title"
                                className="m-0 text-[17px] font-semibold tracking-[-0.02em] text-paper-fg"
                            >
                                Edit category
                            </h2>
                        </div>
                        <button
                            type="button"
                            onClick={closeModal}
                            disabled={isSubmitting}
                            className="grid h-8 w-8 shrink-0 place-items-center rounded-paper border border-transparent bg-transparent text-paper-muted transition-colors hover:bg-[color-mix(in_oklch,var(--fg)_4%,transparent)] hover:text-paper-fg disabled:opacity-50"
                            aria-label="Close"
                        >
                            <X className="h-4 w-4" strokeWidth={2} />
                        </button>
                    </div>

                    {currentItem ? (
                        <div className={categoryModalBodyClass}>
                            <CategoryPreview
                                name={currentItem.name}
                                colour={currentItem.colour ?? '#888888'}
                            />
                            <label className={categoryModalFieldClass}>
                                <span className={categoryModalFieldLabelClass}>Name</span>
                                <input
                                    ref={editNameInputRef}
                                    id="editCategoryNameInput"
                                    type="text"
                                    value={inputValue}
                                    onChange={(event) => {
                                        setInputValue(event.target.value);
                                        if (showEditNameError && event.target.value.trim()) {
                                            setShowEditNameError(false);
                                        }
                                    }}
                                    disabled={isSubmitting}
                                    className={cn(inputDarkClass, 'h-8 w-full px-2.5')}
                                />
                            </label>
                            {modalMode === 'editSub' ? (
                                <label className={categoryModalFieldClass}>
                                    <span className={categoryModalFieldLabelClass}>
                                        Parent category
                                    </span>
                                    <select
                                        id="editCategoryParentSelect"
                                        value={editParentId}
                                        onChange={(event) => setEditParentId(event.target.value)}
                                        disabled={isSubmitting}
                                        className={cn(inputDarkClass, 'h-8 w-full cursor-pointer px-2.5')}
                                    >
                                        {topLevelParentOptions.map((parent) => (
                                            <option key={parent.id} value={parent.id}>
                                                {parent.name}
                                            </option>
                                        ))}
                                    </select>
                                </label>
                            ) : (
                                <p className={categoryModalNoteClass}>
                                    Top-level category — move sub-categories into it from their own
                                    edit screen.
                                </p>
                            )}
                            {showEditNameError ? (
                                <p className={categoryFormErrorClass}>Name can&apos;t be empty.</p>
                            ) : null}
                            {modalError ? (
                                <p className={categoryFormErrorClass}>{modalError}</p>
                            ) : null}
                        </div>
                    ) : null}

                    <div className="flex justify-end gap-2 border-t border-paper-border px-[22px] py-3.5">
                        <button
                            type="button"
                            onClick={closeModal}
                            disabled={isSubmitting}
                            className={catBtnClass}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className={catBtnPrimaryClass}
                        >
                            {isSubmitting ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                'Save changes'
                            )}
                        </button>
                    </div>
                </form>
            </dialog>

            <dialog
                ref={addDialogRef}
                className={categoryDialogClass}
                aria-labelledby="add-category-title"
                onCancel={(event) => {
                    event.preventDefault();
                    if (!isSubmitting) {
                        closeModal();
                    }
                }}
                onClose={closeModal}
            >
                <form className="flex min-h-0 flex-col" onSubmit={handleAddSubmit}>
                    <div className="flex items-start justify-between gap-3 px-[22px] pt-[18px]">
                        <div className="min-w-0">
                            <span className={cn(eyebrowClass, 'mb-1 block')}>Categories</span>
                            <h2
                                id="add-category-title"
                                className="m-0 text-[17px] font-semibold tracking-[-0.02em] text-paper-fg"
                            >
                                {modalMode === 'addSub'
                                    ? 'New subcategory'
                                    : 'New category'}
                            </h2>
                            {modalMode === 'addSub' && parentCategory ? (
                                <p className="m-0 mt-1 text-[12.5px] text-paper-muted">
                                    Under &ldquo;{parentCategory.name}&rdquo;
                                </p>
                            ) : null}
                        </div>
                        <button
                            type="button"
                            onClick={closeModal}
                            disabled={isSubmitting}
                            className="grid h-8 w-8 shrink-0 place-items-center rounded-paper border border-transparent bg-transparent text-paper-muted transition-colors hover:bg-[color-mix(in_oklch,var(--fg)_4%,transparent)] hover:text-paper-fg disabled:opacity-50"
                            aria-label="Close"
                        >
                            <X className="h-4 w-4" strokeWidth={2} />
                        </button>
                    </div>

                    <div className={categoryModalBodyClass}>
                        <label className={categoryModalFieldClass}>
                            <span className={categoryModalFieldLabelClass}>Name</span>
                            <input
                                id="addCategoryNameInput"
                                type="text"
                                value={inputValue}
                                onChange={(event) => setInputValue(event.target.value)}
                                disabled={isSubmitting}
                                required
                                className={cn(inputDarkClass, 'h-8 w-full px-2.5')}
                                placeholder={
                                    modalMode === 'addSub'
                                        ? 'Enter subcategory name'
                                        : 'Enter category name'
                                }
                            />
                        </label>
                        <label className={categoryModalFieldClass}>
                            <span className={categoryModalFieldLabelClass}>Colour</span>
                            <div className="flex items-center gap-3">
                                <input
                                    type="color"
                                    id="addCategoryColourInput"
                                    value={inputColour}
                                    onChange={(event) => setInputColour(event.target.value)}
                                    className={cn(inputDarkClass, 'h-8 w-16 cursor-pointer px-1')}
                                    disabled={isSubmitting}
                                />
                                <CategoryPill
                                    name={inputValue.trim() || 'Preview'}
                                    colour={inputColour}
                                />
                            </div>
                        </label>
                        {modalError ? (
                            <p className={categoryFormErrorClass}>{modalError}</p>
                        ) : null}
                    </div>

                    <div className="flex justify-end gap-2 border-t border-paper-border px-[22px] py-3.5">
                        <button
                            type="button"
                            onClick={closeModal}
                            disabled={isSubmitting}
                            className={catBtnClass}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting || !inputValue.trim()}
                            className={catBtnPrimaryClass}
                        >
                            {isSubmitting ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                'Add'
                            )}
                        </button>
                    </div>
                </form>
            </dialog>

            <dialog
                ref={deleteDialogRef}
                className={categoryDialogClass}
                aria-labelledby="delete-category-title"
                onCancel={(event) => {
                    event.preventDefault();
                    if (!isSubmitting) {
                        closeDeleteModal();
                    }
                }}
                onClose={closeDeleteModal}
            >
                <div className="flex min-h-0 flex-col">
                    <div className="flex items-start justify-between gap-3 px-[22px] pt-[18px]">
                        <div className="min-w-0">
                            <span className={cn(eyebrowClass, 'mb-1 block')}>Categories</span>
                            <h2
                                id="delete-category-title"
                                className="m-0 text-[17px] font-semibold tracking-[-0.02em] text-paper-fg"
                            >
                                Delete category
                            </h2>
                        </div>
                        <button
                            type="button"
                            onClick={closeDeleteModal}
                            disabled={isSubmitting}
                            className="grid h-8 w-8 shrink-0 place-items-center rounded-paper border border-transparent bg-transparent text-paper-muted transition-colors hover:bg-[color-mix(in_oklch,var(--fg)_4%,transparent)] hover:text-paper-fg disabled:opacity-50"
                            aria-label="Close"
                        >
                            <X className="h-4 w-4" strokeWidth={2} />
                        </button>
                    </div>

                    {itemToDelete ? (
                        <div className={categoryModalBodyClass}>
                            <CategoryPreview
                                name={itemToDelete.name}
                                colour={itemToDelete.colour ?? '#888888'}
                            />
                            {deleteBlockedChildren.length > 0 ? (
                                <>
                                    <p>
                                        This category has {deleteBlockedChildren.length}{' '}
                                        sub-categor
                                        {deleteBlockedChildren.length === 1 ? 'y' : 'ies'}. Delete
                                        or move {deleteBlockedChildren.length === 1 ? 'it' : 'them'}{' '}
                                        first:
                                    </p>
                                    <ul className={categoryChildListClass}>
                                        {deleteBlockedChildren.map((child) => (
                                            <li key={child.id}>{child.name}</li>
                                        ))}
                                    </ul>
                                </>
                            ) : (
                                <>
                                    <p>
                                        Transactions keep this category assignment — it&apos;s just
                                        hidden from category pickers and reports while deleted.
                                    </p>
                                    <p className={categoryModalNoteClass}>
                                        Restore anytime from &ldquo;Show deleted&rdquo; — nothing is
                                        changed until you do.
                                    </p>
                                </>
                            )}
                            {error ? (
                                <InlineAlert variant="error" onDismiss={() => setError(null)}>
                                    {error}
                                </InlineAlert>
                            ) : null}
                        </div>
                    ) : null}

                    <div className="flex justify-end gap-2 border-t border-paper-border px-[22px] py-3.5">
                        {deleteBlockedChildren.length > 0 ? (
                            <button
                                type="button"
                                onClick={closeDeleteModal}
                                disabled={isSubmitting}
                                className={catBtnClass}
                            >
                                Close
                            </button>
                        ) : (
                            <>
                                <button
                                    type="button"
                                    onClick={closeDeleteModal}
                                    disabled={isSubmitting}
                                    className={catBtnClass}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={() => void confirmDelete()}
                                    disabled={isSubmitting}
                                    className={categoryDialogBtnDangerClass}
                                >
                                    {isSubmitting ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                        'Delete category'
                                    )}
                                </button>
                            </>
                        )}
                    </div>
                </div>
            </dialog>

            <Modal
                open={isBulkMergeOpen}
                onClose={closeBulkMergeModal}
                closeDisabled={isSubmitting}
                title={
                    <span className="inline-flex items-center gap-2">
                        <GitMerge size={20} />
                        Merge {selectedCategoryIds.size} categories
                    </span>
                }
                description="All selected categories except the target will be merged into it and soft-deleted."
                footer={
                    <>
                        <button
                            type="button"
                            onClick={closeBulkMergeModal}
                            disabled={isSubmitting}
                            className={buttonOutlineClass}
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            onClick={() => void confirmBulkMerge()}
                            disabled={isSubmitting || !bulkMergeTargetId}
                            className={cn(buttonWarningClass, 'min-w-[100px]')}
                        >
                            {isSubmitting ? (
                                <Loader2 className="h-5 w-5 animate-spin" />
                            ) : (
                                'Merge'
                            )}
                        </button>
                    </>
                }
            >
                {modalError ? (
                    <InlineAlert variant="error" className="mb-4">
                        {modalError}
                    </InlineAlert>
                ) : null}
                <label
                    htmlFor="bulkMergeTargetSelect"
                    className="mb-1 block text-sm font-medium text-paper-fg"
                >
                    Merge into
                </label>
                <select
                    id="bulkMergeTargetSelect"
                    value={bulkMergeTargetId}
                    onChange={(event) => setBulkMergeTargetId(event.target.value)}
                    disabled={isSubmitting}
                    className={cn(inputDarkClass, 'w-full cursor-pointer px-3 py-2')}
                >
                    <option value="">Select a category…</option>
                    {bulkMergeTargetOptions.map((cat) => (
                        <option key={cat.id} value={cat.id}>
                            {cat.parent_category_id
                                ? `${categories.find((parent) => parent.id === cat.parent_category_id)?.name ?? 'Parent'} › ${cat.name}`
                                : cat.name}
                        </option>
                    ))}
                </select>
            </Modal>

            {toast ? (
                <div
                    role="status"
                    className="pointer-events-auto fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-full bg-paper-fg px-4 py-2.5 text-[13px] font-medium text-paper-surface shadow-2xl shadow-paper-fg/25"
                >
                    <span className="text-[var(--success)]">
                        {toast.icon === 'restore' ? (
                            <RotateCcw size={15} />
                        ) : (
                            <Check size={15} />
                        )}
                    </span>
                    <span>{toast.message}</span>
                    {toast.onUndo ? (
                        <button
                            type="button"
                            className="ml-1 border-0 bg-transparent font-semibold text-paper-surface underline underline-offset-2"
                            onClick={() => {
                                toast.onUndo?.();
                                setToast(null);
                            }}
                        >
                            Undo
                        </button>
                    ) : null}
                </div>
            ) : null}

        </PageShell>
    );
};
