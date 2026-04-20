# LookupFieldQuickViewControl

A **Power Apps Component Framework (PCF)** custom control for **Dynamics 365 / Power Apps model-driven apps** that replaces a standard lookup field with an enhanced version that retains all default lookup behaviour **and** adds a quick-view icon.  When the icon is clicked the related record is opened in a centred dialog using the Dynamics 365 form specified by the `QuickViewFormId` configuration property.

---

## Features

| Feature | Description |
|---|---|
| **Lookup field replacement** | Renders a read-only text field showing the currently selected record name, a **Search** button that opens the platform lookup dialog, and a **Clear** button to remove the selection. |
| **Quick-view icon** | An **ℹ Info** icon appears next to the field whenever a record is selected.  Clicking it opens the related record in a dialog using the configured quick-view form. |
| **Configurable form** | Pass the GUID of any Dynamics 365 form (typically a Quick View form) as the `QuickViewFormId` input property.  If omitted the record opens using its default form. |
| **Security-aware** | Respects the field-level security configured on the bound lookup column – the Search / Clear buttons are hidden when the field is read-only, and the entire control is hidden when the field is not readable. |
| **Error handling** | Inline error banner if the navigation call fails, with a dismiss button. |

---

## Project structure

```
/
├── ControlManifest.Input.xml          – PCF control manifest
├── index.ts                           – PCF entry point (ReactControl)
├── generated/
│   └── ManifestTypes.d.ts             – TypeScript types derived from the manifest
├── components/
│   ├── LookupQuickViewControlComponent.tsx        – React component
│   └── LookupQuickViewControlComponent.types.ts   – Component prop types
├── __tests__/
│   └── LookupQuickViewControlComponent.test.tsx   – Jest / React Testing Library tests
├── babel.config.json                  – Babel config (for Jest)
├── jest.config.js                     – Jest configuration
├── tsconfig.json                      – TypeScript configuration
└── package.json
```

---

## Control properties

| Property | Type | Usage | Required | Description |
|---|---|---|---|---|
| `LookupField` | `Lookup.Simple` | bound | ✅ | The lookup column this control is bound to on the form. |
| `QuickViewFormId` | `SingleLine.Text` | input | ❌ | GUID of the Dynamics 365 form to open when the quick-view icon is clicked.  If empty the record opens using its default form. |

---

## Getting started

### Prerequisites

* [Node.js](https://nodejs.org/) ≥ 16
* [Microsoft Power Platform CLI](https://learn.microsoft.com/power-platform/developer/cli/introduction) (`pac` CLI) – optional, used for packaging and deploying

### Install dependencies

```bash
npm install
```

### Run tests

```bash
npm test
```

### Build

```bash
npm run build
```

This runs `pcf-scripts build` and produces a bundled `index.js` in the `out/` folder.

### Pack for deployment

```bash
pac pcf push   # push directly to an environment (requires authentication)
# or
pac solution init --publisher-name YourPublisher --publisher-prefix xrm
pac solution add-reference --path .
msbuild /t:build /restore
```

---

## How it works

1. The PCF framework calls `updateView` on every context change and passes the current `IInputs` context to the React component.
2. The React component reads `context.parameters.LookupField.raw` for the current selection and `context.parameters.QuickViewFormId.raw` for the form GUID.
3. **Search** – calls `context.utils.lookupObjects(…)` which opens the standard Dynamics 365 lookup dialog and returns the user's selection.
4. **Clear** – calls the `onChange` callback with `undefined` which triggers `notifyOutputChanged` so the platform writes the empty value back to the record.
5. **Quick-view** – calls `context.navigation.openForm({ entityName, entityId, formId, windowPosition: 1 })` to open the related record centred as a dialog.

---

## License

MIT
