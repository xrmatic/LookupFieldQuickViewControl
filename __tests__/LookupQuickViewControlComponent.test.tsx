import * as React from "react";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import "@testing-library/jest-dom";
import { LookupQuickViewControlComponent } from "../components/LookupQuickViewControlComponent";
import { IInputs } from "../generated/ManifestTypes";

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Build a minimal mock PCF LookupProperty. */
function makeLookupProperty(
    selected: ComponentFramework.LookupValue | null,
    options: {
        editable?: boolean;
        readable?: boolean;
        targetEntity?: string;
        viewId?: string;
    } = {},
): ComponentFramework.PropertyTypes.LookupProperty {
    return {
        raw: selected ? [selected] : [],
        security: {
            editable: options.editable !== false,
            readable: options.readable !== false,
            secured: false,
        },
        attributes: { DisplayName: "Test Lookup" } as unknown as ComponentFramework.PropertyHelper.FieldPropertyMetadata.LookupMetadata,
        getTargetEntityType: () => options.targetEntity ?? "account",
        getViewId: () => options.viewId ?? "00000000-0000-0000-0000-000000000001",
        type: "Lookup.Simple",
    } as unknown as ComponentFramework.PropertyTypes.LookupProperty;
}

/** Build a minimal mock PCF StringProperty. */
function makeStringProperty(value: string): ComponentFramework.PropertyTypes.StringProperty {
    return {
        raw: value,
        type: "SingleLine.Text",
        security: { editable: true, readable: true, secured: false },
    } as unknown as ComponentFramework.PropertyTypes.StringProperty;
}

/** Build a minimal mock PCF Context. */
function makeContext(overrides: {
    selectedRecord?: ComponentFramework.LookupValue | null;
    quickViewFormId?: string;
    editable?: boolean;
    readable?: boolean;
    lookupResult?: ComponentFramework.LookupValue[];
    openFormImpl?: jest.Mock;
}): ComponentFramework.Context<IInputs> {
    const {
        selectedRecord = null,
        quickViewFormId = "",
        editable = true,
        readable = true,
        lookupResult = [],
        openFormImpl = jest.fn().mockResolvedValue(undefined),
    } = overrides;

    return {
        parameters: {
            LookupField: makeLookupProperty(selectedRecord, { editable, readable }),
            QuickViewFormId: makeStringProperty(quickViewFormId),
        },
        utils: {
            lookupObjects: jest.fn().mockResolvedValue(lookupResult),
        },
        navigation: {
            openForm: openFormImpl,
        },
    } as unknown as ComponentFramework.Context<IInputs>;
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("LookupQuickViewControlComponent", () => {
    const onChangeMock = jest.fn();

    beforeEach(() => {
        onChangeMock.mockReset();
    });

    // ── Rendering ────────────────────────────────────────────────────────────

    it("renders the text field with placeholder when no record is selected", () => {
        const ctx = makeContext({});
        render(<LookupQuickViewControlComponent context={ctx} onChange={onChangeMock} />);
        const input = screen.getByRole("textbox") as HTMLInputElement;
        expect(input).toBeInTheDocument();
        expect(input.placeholder).toBe("---");
        expect(input.value).toBe("");
    });

    it("renders the selected record name in the text field", () => {
        const ctx = makeContext({
            selectedRecord: { id: "abc-123", name: "Contoso Ltd", entityType: "account" },
        });
        render(<LookupQuickViewControlComponent context={ctx} onChange={onChangeMock} />);
        const input = screen.getByRole("textbox") as HTMLInputElement;
        expect(input.value).toBe("Contoso Ltd");
    });

    it("renders the Search button when the field is editable", () => {
        const ctx = makeContext({ editable: true });
        render(<LookupQuickViewControlComponent context={ctx} onChange={onChangeMock} />);
        expect(screen.getByTitle("Search")).toBeInTheDocument();
    });

    it("does NOT render the Search button when the field is read-only", () => {
        const ctx = makeContext({ editable: false });
        render(<LookupQuickViewControlComponent context={ctx} onChange={onChangeMock} />);
        expect(screen.queryByTitle("Search")).not.toBeInTheDocument();
    });

    it("renders the Clear button only when a record is selected and field is editable", () => {
        const withRecord = makeContext({
            selectedRecord: { id: "1", name: "Contoso", entityType: "account" },
            editable: true,
        });
        const { rerender } = render(
            <LookupQuickViewControlComponent context={withRecord} onChange={onChangeMock} />,
        );
        expect(screen.getByTitle("Clear")).toBeInTheDocument();

        // No record → Clear should disappear
        const noRecord = makeContext({ editable: true });
        rerender(<LookupQuickViewControlComponent context={noRecord} onChange={onChangeMock} />);
        expect(screen.queryByTitle("Clear")).not.toBeInTheDocument();
    });

    it("does NOT render anything when the field is not readable", () => {
        const ctx = makeContext({ readable: false });
        const { container } = render(
            <LookupQuickViewControlComponent context={ctx} onChange={onChangeMock} />,
        );
        expect(container.firstChild).toBeNull();
    });

    // ── Quick-view icon visibility ────────────────────────────────────────────

    it("shows the quick-view icon when a record is selected", () => {
        const ctx = makeContext({
            selectedRecord: { id: "1", name: "Contoso", entityType: "account" },
            quickViewFormId: "form-guid",
        });
        render(<LookupQuickViewControlComponent context={ctx} onChange={onChangeMock} />);
        expect(screen.getByTitle("Open quick view")).toBeInTheDocument();
    });

    it("shows 'Open record' title when no QuickViewFormId is configured", () => {
        const ctx = makeContext({
            selectedRecord: { id: "1", name: "Contoso", entityType: "account" },
            quickViewFormId: "",
        });
        render(<LookupQuickViewControlComponent context={ctx} onChange={onChangeMock} />);
        expect(screen.getByTitle("Open record")).toBeInTheDocument();
    });

    it("does NOT show the quick-view icon when no record is selected", () => {
        const ctx = makeContext({ quickViewFormId: "form-guid" });
        render(<LookupQuickViewControlComponent context={ctx} onChange={onChangeMock} />);
        expect(screen.queryByTitle("Open quick view")).not.toBeInTheDocument();
        expect(screen.queryByTitle("Open record")).not.toBeInTheDocument();
    });

    // ── Search interaction ────────────────────────────────────────────────────

    it("calls lookupObjects and invokes onChange when a record is picked", async () => {
        const picked: ComponentFramework.LookupValue = {
            id: "abc",
            name: "Picked Corp",
            entityType: "account",
        };
        const ctx = makeContext({ lookupResult: [picked] });
        render(<LookupQuickViewControlComponent context={ctx} onChange={onChangeMock} />);

        await act(async () => {
            fireEvent.click(screen.getByTitle("Search"));
        });

        expect(ctx.utils.lookupObjects).toHaveBeenCalledTimes(1);
        expect(onChangeMock).toHaveBeenCalledWith([
            { id: "abc", name: "Picked Corp", entityType: "account" },
        ]);
    });

    it("does not invoke onChange when the lookup dialog is cancelled (empty result)", async () => {
        const ctx = makeContext({ lookupResult: [] });
        render(<LookupQuickViewControlComponent context={ctx} onChange={onChangeMock} />);

        await act(async () => {
            fireEvent.click(screen.getByTitle("Search"));
        });

        expect(onChangeMock).not.toHaveBeenCalled();
    });

    it("handles lookup dialog rejection gracefully (user cancels via exception)", async () => {
        const ctx = makeContext({});
        (ctx.utils.lookupObjects as jest.Mock).mockRejectedValueOnce(new Error("cancelled"));
        render(<LookupQuickViewControlComponent context={ctx} onChange={onChangeMock} />);

        await act(async () => {
            fireEvent.click(screen.getByTitle("Search"));
        });

        // Should not crash, no onChange called
        expect(onChangeMock).not.toHaveBeenCalled();
    });

    // ── Clear interaction ─────────────────────────────────────────────────────

    it("calls onChange(undefined) when the Clear button is clicked", () => {
        const ctx = makeContext({
            selectedRecord: { id: "1", name: "Contoso", entityType: "account" },
        });
        render(<LookupQuickViewControlComponent context={ctx} onChange={onChangeMock} />);

        fireEvent.click(screen.getByTitle("Clear"));

        expect(onChangeMock).toHaveBeenCalledWith(undefined);
    });

    // ── Quick-view interaction ────────────────────────────────────────────────

    it("calls navigation.openForm with formId when quick-view icon is clicked", async () => {
        const openFormMock = jest.fn().mockResolvedValue(undefined);
        const ctx = makeContext({
            selectedRecord: { id: "rec-001", name: "Contoso", entityType: "account" },
            quickViewFormId: "form-guid-001",
            openFormImpl: openFormMock,
        });

        render(<LookupQuickViewControlComponent context={ctx} onChange={onChangeMock} />);

        await act(async () => {
            fireEvent.click(screen.getByTitle("Open quick view"));
        });

        expect(openFormMock).toHaveBeenCalledTimes(1);
        const callArgs = openFormMock.mock.calls[0][0];
        expect(callArgs.entityName).toBe("account");
        expect(callArgs.entityId).toBe("rec-001");
        expect(callArgs.formId).toBe("form-guid-001");
    });

    it("calls navigation.openForm without formId when QuickViewFormId is empty", async () => {
        const openFormMock = jest.fn().mockResolvedValue(undefined);
        const ctx = makeContext({
            selectedRecord: { id: "rec-002", name: "Fabrikam", entityType: "contact" },
            quickViewFormId: "",
            openFormImpl: openFormMock,
        });

        render(<LookupQuickViewControlComponent context={ctx} onChange={onChangeMock} />);

        await act(async () => {
            fireEvent.click(screen.getByTitle("Open record"));
        });

        expect(openFormMock).toHaveBeenCalledTimes(1);
        const callArgs = openFormMock.mock.calls[0][0];
        expect(callArgs.entityName).toBe("contact");
        expect(callArgs.entityId).toBe("rec-002");
        expect(callArgs.formId).toBeUndefined();
    });

    it("shows an error message when navigation.openForm rejects", async () => {
        const openFormMock = jest.fn().mockRejectedValueOnce(new Error("Navigation failed"));
        const ctx = makeContext({
            selectedRecord: { id: "rec-003", name: "ACME", entityType: "account" },
            quickViewFormId: "form-guid-002",
            openFormImpl: openFormMock,
        });

        render(<LookupQuickViewControlComponent context={ctx} onChange={onChangeMock} />);

        await act(async () => {
            fireEvent.click(screen.getByTitle("Open quick view"));
        });

        await waitFor(() => {
            expect(screen.getByText("Navigation failed")).toBeInTheDocument();
        });
    });

    it("dismisses the error message when the close button is clicked", async () => {
        const openFormMock = jest.fn().mockRejectedValueOnce(new Error("Oops"));
        const ctx = makeContext({
            selectedRecord: { id: "1", name: "Test", entityType: "account" },
            quickViewFormId: "f",
            openFormImpl: openFormMock,
        });

        render(<LookupQuickViewControlComponent context={ctx} onChange={onChangeMock} />);

        await act(async () => {
            fireEvent.click(screen.getByTitle("Open quick view"));
        });

        await waitFor(() => expect(screen.getByText("Oops")).toBeInTheDocument());

        fireEvent.click(screen.getByLabelText("Close"));

        await waitFor(() => expect(screen.queryByText("Oops")).not.toBeInTheDocument());
    });
});
