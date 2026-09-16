# Database Changes
1. Alter `epi_assignments`:
   - ADD `catalog_id UUID REFERENCES public.epi_catalog(id) ON DELETE CASCADE`
   - Data migration: UPDATE epi_assignments SET catalog_id = (SELECT epi_catalog_id FROM epi_inventory WHERE id = epi_assignments.epi_id)
   - DROP `epi_id` column
2. Alter `inventory_transactions`:
   - ADD `catalog_id UUID REFERENCES public.epi_catalog(id) ON DELETE CASCADE`
   - DROP `epi_id`
   - DROP `previous_status`, `new_status` (we just track `quantity` change now)
   - ADD `quantity_change INTEGER`
3. Update Triggers and RPCs:
   - DROP `epi_inventory` related triggers.
   - `assign_epi(p_worker_id UUID, p_catalog_id UUID)`
   - `return_epi(p_assignment_id UUID, p_condition item_condition)` (Passing assignment_id is safer than worker + catalog, since a worker could have multiple of the same catalog item. Wait, the frontend might not know assignment_id easily. Let's see what `ReturnForm` has).
4. Drop `epi_inventory` table.

# Frontend Changes
1. `Assets.tsx`: Remove Tabs, just show Catalog.
2. `useEpiAssets.ts`: Remove `epi_inventory` fetches.
3. `Operations.tsx`:
   - `Entregas`: Validate `quantity <= catalog.current_stock`.
   - `Devoluções`: Fetch `epi_assignments` joined with `epi_catalog`.
4. `ReturnForm.tsx`: Update to use `assignment_id` or `catalog_id`.
