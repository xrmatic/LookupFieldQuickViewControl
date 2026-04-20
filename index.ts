import * as React from "react";
import { IInputs, IOutputs } from "./generated/ManifestTypes";
import { LookupQuickViewControlComponent } from "./components/LookupQuickViewControlComponent";

/**
 * LookupFieldQuickViewControl
 *
 * A PCF React control that replaces a standard Dynamics 365 lookup field with a
 * custom implementation that retains the default lookup behaviour and adds a
 * quick view icon.  When the icon is clicked the related record is opened using
 * the Dynamics 365 form whose GUID is supplied via the `QuickViewFormId`
 * configuration property.
 */
export class LookupFieldQuickViewControl
    implements ComponentFramework.ReactControl<IInputs, IOutputs>
{
    private _notifyOutputChanged: () => void;
    private _context: ComponentFramework.Context<IInputs>;
    private _currentValue: ComponentFramework.LookupValue[] | undefined;

    // ── Lifecycle ─────────────────────────────────────────────────────────────

    public init(
        context: ComponentFramework.Context<IInputs>,
        notifyOutputChanged: () => void,
        _state: ComponentFramework.Dictionary,
    ): void {
        this._notifyOutputChanged = notifyOutputChanged;
        this._context = context;
        // Capture the initial value so getOutputs() has something to return
        // before the first user interaction.
        this._currentValue = context.parameters.LookupField.raw ?? undefined;
    }

    public updateView(context: ComponentFramework.Context<IInputs>): React.ReactElement {
        this._context = context;

        return React.createElement(LookupQuickViewControlComponent, {
            context,
            onChange: this._onChange.bind(this),
        });
    }

    public getOutputs(): IOutputs {
        return {
            LookupField: this._currentValue,
        };
    }

    public destroy(): void {
        // Nothing to clean up for a virtual (React) control.
    }

    // ── Private helpers ───────────────────────────────────────────────────────

    private _onChange(value: ComponentFramework.LookupValue[] | undefined): void {
        this._currentValue = value;
        this._notifyOutputChanged();
    }
}
