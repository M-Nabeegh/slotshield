/** The GitHub Pages build is static, so the two server routes do not exist there. */
export const apiAvailable = import.meta.env.MODE !== "pages";
