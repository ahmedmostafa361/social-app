import { model, Schema } from "mongoose";
import { numericEnumValues } from "../../auth/enum/enum.js";
import { FollowStatus } from "../enum/enum.js";
import type { IFollow } from "../interface/user.interface.js";

const followSchema = new Schema<IFollow>(
    {
        follower: { type: Schema.Types.ObjectId, ref: "User", required: true },
        following: { type: Schema.Types.ObjectId, ref: "User", required: true },
        status: {
            type: Number,
            enum: numericEnumValues(FollowStatus),
            default: FollowStatus.ACCEPTED,
        },
        acceptedAt: Date,
    },
    { timestamps: true }
);

followSchema.index({ follower: 1, following: 1 }, { unique: true });
followSchema.index({ following: 1, status: 1, createdAt: -1 });
followSchema.index({ follower: 1, status: 1, createdAt: -1 });

export const Follow = model<IFollow>("Follow", followSchema);
