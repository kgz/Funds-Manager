// Import the RTK Query methods from the React-specific entry point
import { createSlice } from '@reduxjs/toolkit'
import { getAllCategoriesThunkActions, type Category } from '../thunks/category.get.all'
import type { UncategorizedUsage } from '@/lib/utils/categoryUsage'
import { deleteCategoryThunkActions } from '../thunks/category.delete.single'
import { createCategoryThunkActions } from '../thunks/category.create.single'
import { restoreCategoryThunkActions } from '../thunks/category.restore.single'
import { updateCategoryThunkActions } from '../thunks/category.update.single'

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
	},
})

export const { reducer: CategoryReducer } = slice