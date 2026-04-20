import * as React from "react";
import {
    Stack,
    TextField,
    IconButton,
    IIconProps,
    IStackTokens,
    ITextFieldStyles,
    MessageBar,
    MessageBarType,
    mergeStyleSets,
} from "@fluentui/react";
import { LookupQuickViewControlProps } from "./LookupQuickViewControlComponent.types";

// ─── Icon definitions ────────────────────────────────────────────────────────

const searchIcon: IIconProps = { iconName: "Search" };
const clearIcon: IIconProps = { iconName: "Cancel" };
const quickViewIcon: IIconProps = { iconName: "ContactInfo" };

// ─── Styles ──────────────────────────────────────────────────────────────────

const stackTokens: IStackTokens = { childrenGap: 4 };

const classNames = mergeStyleSets({
    root: {
        width: "100%",
    },
});

const textFieldStyles: Partial<ITextFieldStyles> = {
    root: { flexGrow: 1, minWidth: 0 },
    field: { cursor: "default" },
};

// ─── Component ───────────────────────────────────────────────────────────────

/**
 * LookupQuickViewControlComponent
 *
 * Renders a Dynamics 365 lookup field replacement that:
 *   • Shows the currently selected record name in a read-only text field.
 *   • Provides a **Search** button that opens the platform lookup dialog.
 *   • Provides a **Clear** button to remove the current selection.
 *   • Provides an **Info** icon that opens the related record using the
 *     quick view form configured in the `QuickViewFormId` property.
 */
export const LookupQuickViewControlComponent: React.FC<LookupQuickViewControlProps> = ({
    context,
    onChange,
}) => {
    const [errorMessage, setErrorMessage] = React.useState<string | undefined>(undefined);

    const lookupProperty = context.parameters.LookupField;
    const selectedRecords = lookupProperty.raw;
    const selectedRecord =
        Array.isArray(selectedRecords) && selectedRecords.length > 0
            ? selectedRecords[0]
            : null;

    // Whether the field is editable (respects form security settings)
    const isEditable = lookupProperty.security?.editable !== false;
    // Whether the field is visible to the user
    const isReadable = lookupProperty.security?.readable !== false;

    // The GUID of the configured quick view form (may be empty / undefined)
    const quickViewFormId = context.parameters.QuickViewFormId?.raw ?? "";

    // ── Handlers ──────────────────────────────────────────────────────────────

    const handleSearchClick = React.useCallback(async () => {
        setErrorMessage(undefined);
        try {
            const targetEntityType = lookupProperty.getTargetEntityType();
            const defaultViewId = lookupProperty.getViewId();

            const results = await context.utils.lookupObjects({
                allowMultiSelect: false,
                defaultEntityType: targetEntityType,
                entityTypes: [targetEntityType],
                ...(defaultViewId ? { defaultViewId, viewIds: [defaultViewId] } : {}),
            });

            if (results && results.length > 0) {
                const picked = results[0];
                onChange([
                    {
                        id: picked.id,
                        name: picked.name ?? "",
                        entityType: picked.entityType,
                    },
                ]);
            }
        } catch {
            // The user cancelled the lookup dialog – no action needed.
        }
    }, [context, lookupProperty, onChange]);

    const handleClearClick = React.useCallback(() => {
        setErrorMessage(undefined);
        onChange(undefined);
    }, [onChange]);

    /**
     * Opens the selected record using the configured quick view form.
     *
     * The form opens as a dialog (windowPosition: 1 = center) so the user
     * stays in context. If no QuickViewFormId has been configured, the record
     * is opened using the entity's default form.
     */
    const handleQuickViewClick = React.useCallback(async () => {
        if (!selectedRecord) return;
        setErrorMessage(undefined);

        try {
            await context.navigation.openForm({
                entityName: selectedRecord.entityType,
                entityId: selectedRecord.id,
                ...(quickViewFormId ? { formId: quickViewFormId } : {}),
                windowPosition: 1, // open centred as a dialog
                width: 600,
                height: 600,
            });
        } catch (err: unknown) {
            const message =
                err instanceof Error ? err.message : "Failed to open the quick view form.";
            setErrorMessage(message);
        }
    }, [context, selectedRecord, quickViewFormId]);

    // ── Render ────────────────────────────────────────────────────────────────

    if (!isReadable) {
        return null;
    }

    return (
        <Stack className={classNames.root} tokens={{ childrenGap: 2 }}>
            <Stack horizontal tokens={stackTokens} verticalAlign="end">
                <TextField
                    readOnly
                    value={selectedRecord?.name ?? ""}
                    placeholder="---"
                    title={selectedRecord?.name ?? ""}
                    styles={textFieldStyles}
                    ariaLabel={lookupProperty.attributes?.DisplayName ?? "Lookup"}
                />

                {/* Search button – opens the platform lookup dialog */}
                {isEditable && (
                    <IconButton
                        iconProps={searchIcon}
                        title="Search"
                        ariaLabel="Search for a record"
                        onClick={handleSearchClick}
                    />
                )}

                {/* Clear button – removes the current selection */}
                {isEditable && selectedRecord !== null && (
                    <IconButton
                        iconProps={clearIcon}
                        title="Clear"
                        ariaLabel="Clear the selected record"
                        onClick={handleClearClick}
                    />
                )}

                {/* Quick view icon – shown only when a record is selected */}
                {selectedRecord !== null && (
                    <IconButton
                        iconProps={quickViewIcon}
                        title={quickViewFormId ? "Open quick view" : "Open record"}
                        ariaLabel={
                            quickViewFormId
                                ? "Open quick view for the selected record"
                                : "Open the selected record"
                        }
                        onClick={handleQuickViewClick}
                    />
                )}
            </Stack>

            {/* Inline error display */}
            {errorMessage && (
                <MessageBar
                    messageBarType={MessageBarType.error}
                    isMultiline={false}
                    dismissButtonAriaLabel="Close"
                    onDismiss={() => setErrorMessage(undefined)}
                >
                    {errorMessage}
                </MessageBar>
            )}
        </Stack>
    );
};
