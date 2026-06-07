// Import the RTK Query methods from the React-specific entry point
import { createSlice } from '@reduxjs/toolkit'
import { getAllCategoriesThunkActions, type Category } from '../thunks/category.get.all'
import type { UncategorizedUsage } from '@/lib/utils/categoryUsage'
import { deleteCategoryThunkActions } from '../thunks/category.delete.single'
import { createCategoryThunkActions } from '../thunks/category.create.single'
import { restoreCategoryThunkActions } from '../thunks/category.restore.single'
import { updateCategoryThunkActions } from '../thunks/category.update.single'
import { mergeCategory } from '../thunks/category.merge.single'
import { reorderCategories } from '../thunks/category.reorder'

type InitialState = {
	categoriesLoading: boolean,
	categories: Category[],
	categoriesError: string | null,
	uncategorized: UncategorizedUsage | null,
}

const initialState: InitialState = {
	categoriesLoading: false,
	categories: [],
	categoriesError: null,
	uncategorized: null,
}

const slice = createSlice({
	name: 'categories',
	initialState,
	reducers:{},
	extraReducers(builder) {
		getAllCategoriesThunkActions(builder)
		deleteCategoryThunkActions(builder)
		createCategoryThunkActions(builder)
		restoreCategoryThunkActions(builder)
		updateCategoryThunkActions(builder)
		builder.addCase(mergeCategory.fulfilled, (state, action) => {
			state.categories = state.categories.filter(
				(category) => category.id !== action.payload.sourceId
			);
			const targetIndex = state.categories.findIndex(
				(category) => category.id === action.payload.target.id
			);
			if (targetIndex !== -1) {
				const existing = state.categories[targetIndex];
				state.categories[targetIndex] = {
					...action.payload.target,
					line_count: action.payload.target.line_count ?? existing.line_count,
					spending_total:
						action.payload.target.spending_total ?? existing.spending_total,
					income_total: action.payload.target.income_total ?? existing.income_total,
				};
			}
			state.categoriesError = null;
		});
		builder.addCase(reorderCategories.fulfilled, (state, action) => {
			for (const updated of action.payload) {
				const index = state.categories.findIndex(
					(category) => category.id === updated.id
				);
				if (index !== -1) {
					const existing = state.categories[index];
					state.categories[index] = {
						...updated,
						line_count: updated.line_count ?? existing.line_count,
						spending_total: updated.spending_total ?? existing.spending_total,
						income_total: updated.income_total ?? existing.income_total,
					};
				}
			}
			state.categoriesError = null;
		});
	},
})

export const { reducer: CategoryReducer } = slice