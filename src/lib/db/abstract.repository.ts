import type {
    DeleteResult,
    HydratedDocument,
    Model,
    ProjectionType,
    QueryFilter,
    QueryOptions,
    Types,
    UpdateQuery,
    UpdateWriteOpResult,
} from "mongoose";

export abstract class AbstractRepository<T> {
    protected constructor(protected readonly model: Model<T>) {}

    async create(data: Partial<T> & { _id?: Types.ObjectId }): Promise<HydratedDocument<T>> {
        return this.model.create(data);
    }

    async findOne(
        filter: QueryFilter<T>,
        projection?: ProjectionType<T> | null,
        options?: QueryOptions<T> | null
    ): Promise<HydratedDocument<T> | null> {
        return this.model.findOne(filter, projection, options);
    }

    async findById(
        id: Types.ObjectId | string,
        projection?: ProjectionType<T> | null
    ): Promise<HydratedDocument<T> | null> {
        return this.model.findById(id, projection);
    }

    async exists(filter: QueryFilter<T>): Promise<boolean> {
        return Boolean(await this.model.exists(filter));
    }

    async count(filter: QueryFilter<T>): Promise<number> {
        return this.model.countDocuments(filter);
    }

    async updateOne(
        filter: QueryFilter<T>,
        update: UpdateQuery<T>,
        options: QueryOptions<T> = {}
    ): Promise<HydratedDocument<T> | null> {
        return this.model.findOneAndUpdate(filter, update, {
            returnDocument: "after",
            runValidators: true,
            ...options,
        });
    }

    async updateMany(filter: QueryFilter<T>, update: UpdateQuery<T>): Promise<UpdateWriteOpResult> {
        return this.model.updateMany(filter, update);
    }

    async deleteOne(filter: QueryFilter<T>): Promise<HydratedDocument<T> | null> {
        return this.model.findOneAndDelete(filter);
    }

    async deleteMany(filter: QueryFilter<T>): Promise<DeleteResult> {
        return this.model.deleteMany(filter);
    }
}
