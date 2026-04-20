import { IInputs } from "../generated/ManifestTypes";

/** Props passed from the PCF entry point to the React component. */
export interface LookupQuickViewControlProps {
    /** The full PCF context object, giving access to bound properties and platform APIs. */
    context: ComponentFramework.Context<IInputs>;
    /**
     * Callback invoked when the user selects or clears the lookup value.
     * Pass `undefined` to clear the current selection.
     */
    onChange: (value: ComponentFramework.LookupValue[] | undefined) => void;
}
