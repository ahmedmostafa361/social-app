import { DeleteResult, Model, QueryFilter, QueryOptions, UpdateQuery } from "mongoose";

export abstract class AbstractRepository<T> {
    protected constructor(protected readonly model: Model<T>) {}

    async create(data: T) {
        return this.model.create(data);
    }

    async update(
        filter: QueryFilter<T>,
        newData: UpdateQuery<T>,
        options: QueryOptions<T> = { new: true }
    ) {
        return this.model.findOneAndUpdate(filter, newData, options);
    }

    async delete(filter: QueryFilter<T>): Promise<DeleteResult> {
        return this.model.deleteOne(filter);
    }

    async getOne(filter: QueryFilter<T>) {
        return this.model.findOne(filter);
    }
}