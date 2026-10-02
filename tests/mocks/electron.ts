let dialogResult: Record<string, unknown> = { canceled: true };
export const openedPaths: string[] = [];
export function setDialogResult(result: Record<string, unknown>) { dialogResult = result; }
export const remote = {
  dialog: { showSaveDialog: async () => dialogResult, showOpenDialog: async () => dialogResult },
  shell: { openPath: async (path: string) => { openedPaths.push(path); return ""; } },
};
export default { remote };
