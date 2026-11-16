import { model, Schema, type Types } from "mongoose";

export interface IPost {
    content: string;
    userId: Types.ObjectId;
    commentsCount: number;
    reactionsCount: number;
    allowsComments: boolean;
    isDeleted: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const postSchema = new Schema<IPost>(
    {
        content: {
            type: String,
            required: true,
            trim: true,
            minlength: 1,
            maxlength: 2000,
        },
        userId: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        commentsCount: {
            type: Number,
            default: 0,
            min: 0,
        },
        reactionsCount: {
            type: Number,
            default: 0,
            min: 0,
        },
        allowsComments: {
            type: Boolean,
            default: true,
        },
        isDeleted: {
            type: Boolean,
            default: false,
        },
    },
    { timestamps: true }
);

postSchema.index({ userId: 1, isDeleted: 1, createdAt: -1 });

export const Post = model<IPost>("Post", postSchema);
