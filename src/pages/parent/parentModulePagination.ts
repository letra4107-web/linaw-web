/** Client-side pagination for the parent's read-only module report. */
export function paginateModules<T>(modules: readonly T[], requestedPage: number, requestedPageSize = 5) {
  const pageSize = Number.isFinite(requestedPageSize) ? Math.max(1, Math.floor(requestedPageSize)) : 5;
  const pageCount = Math.max(1, Math.ceil(modules.length / pageSize));
  const page = Number.isFinite(requestedPage) ? Math.max(1, Math.min(Math.floor(requestedPage), pageCount)) : 1;
  const startIndex = (page - 1) * pageSize;
  const pages = Array.from({ length: pageCount }, (_, index) => index + 1)
    .filter((number) => number === 1 || number === pageCount || Math.abs(number - page) <= 1);
  return {
    page,
    pageCount,
    startIndex,
    start: modules.length ? startIndex + 1 : 0,
    end: Math.min(startIndex + pageSize, modules.length),
    rows: modules.slice(startIndex, startIndex + pageSize),
    pages,
  };
}
