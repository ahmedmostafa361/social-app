export interface Pagination {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
}

export const buildPagination = (page: number, limit: number, total: number): Pagination => ({
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
    hasNextPage: page * limit < total,
});

export const skipFor = (page: number, limit: number): number => (page - 1) * limit;
