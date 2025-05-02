// Import the RTK Query methods from the React-specific entry point
import { createSlice } from '@reduxjs/toolkit'
import { createMappingThunkActions } from '../thunks/mapping.create.single';
import { getMappingThunkActions } from '../thunks/mapping.get.all';
import { deleteMappingThunkActions } from '../thunks/mapping.delete.single';
import { editMappingThunkActions } from '../thunks/mapping.update.single';


// --- Type Definitions (Copied from categories.tsx) ---
export type CategoryMappingsMatch = "Exact" | "Regex";

export type CategoryMapping = {
    id: number; // u32
    pattern: string;
    match_type: CategoryMappingsMatch;
    category_id: number; // Corresponds to Category.id or Subcategory.id (u64 on backend, string here)
    priority: number; // i32
    created_at: string; // NaiveDateTime (ISO 8601 string)
    updated_at: string; // NaiveDateTime
};


type InitialState = {
	mappings: CategoryMapping[],
}

const initialState: InitialState = {
	mappings: [],
	
}

const slice = createSlice({
	name: 'mappings',
	initialState,
	reducers:{},
	extraReducers(builder) {
		createMappingThunkActions(builder)
		getMappingThunkActions(builder)
		deleteMappingThunkActions(builder)
		editMappingThunkActions(builder)
	},
})

export const { reducer: MappingReducer } = slice