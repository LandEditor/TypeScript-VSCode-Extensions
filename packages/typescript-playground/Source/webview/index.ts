import "@vscode/webview-ui-toolkit/dist/toolkit";

import { createDesignSystem } from "./createDesignSystem";

type VSCode = {
	// postMessage<T extends Message = Message>(message: T): void;

	postMessage(message: any): void;

	getState(): any;

	setState(state: any): void;
};
declare function acquireVsCodeApi(): VSCode;

const thisTS = () => {
	// @ts-ignore
	return window["ts"] as typeof import("typescript") | undefined;
};

// Get access to the VS Code API from within the webview context
const vscode = acquireVsCodeApi();
// @ts-ignore
window.addEventListener("load", main);

function main() {
	setVSCodeMessageListener();

	// Make a loop checking for when we have access to the typescript API in the global scope
	const interval = setInterval(() => {
		const ts = thisTS();

		if (ts) {
			vscode.postMessage({ msg: "ts-ready", version: ts.version });

			clearInterval(interval);
		}
	}, 300);
}

function setVSCodeMessageListener() {
	// @ts-ignore
	window.addEventListener("message", (event) => {
		const command = event.data.command;

		console.log(event.data);

		switch (command) {
			case "updateTS":
				const ts = thisTS();

				if (!ts) {
					return;
				}

				const ds = createDesignSystem(ts);

				let result = ts.transpileModule(event.data.ts, {
					compilerOptions: { module: ts.ModuleKind.CommonJS },
				});

				// js
				const v1 = document.getElementById("view-1");

				if (v1) {
					const jsDS = ds(v1);

					jsDS.clear();

					jsDS.code(result.outputText);
				}

				// dts
				const v2 = document.getElementById("view-2");

				if (v2) {
					// v2.textContent = result.outputText
					const jsDS = ds(v2);

					jsDS.clear();

					jsDS.code(".d.ts not supported right now, sorry");
				}

				// diags
				const v3 = document.getElementById("view-3");

				if (v3) {
					const errorDS = ds(v3);

					errorDS.clear();

					const errorTab = document.getElementById("tab-3")!;

					if (event.data.diags.length) {
						errorTab.innerHTML = `ERRORS <vscode-badge appearance="secondary">${event.data.diags.length}</vscode-badge>`;

						const diags = event.data
							.diags as import("vscode").Diagnostic[];

						const tsDiags = diags.filter((d) => d.source === "ts");

						const tsStyleDiags = tsDiags.map((d) => {
							const tsd: import("typescript").DiagnosticRelatedInformation =
								{
									category: markerToDiagSeverity(
										d.severity as any,
									),
									code: d.code as any,
									messageText: d.message,
									file: undefined,
									// @ts-ignore the JSONification process destroys the class
									length:
										d.range[1].character -
										d.range[0].character,
									// @ts-ignore
									start: d.range[1].character,
								};

							return tsd;
						});

						errorDS.listDiags(tsStyleDiags);
					} else {
						errorTab.innerHTML = "ERRORS";
					}
				}

				break;
		}
	});
}

const markerToDiagSeverity = (markerSev: string) => {
	switch (markerSev) {
		case "Error":
			return 1;

		case "Warning":
			return 0;

		case "Hint":
			return 2;

		case "Information":
			return 3;

		default:
			return 3;
	}
};
