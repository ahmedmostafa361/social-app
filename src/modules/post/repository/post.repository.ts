import { AbstractRepository } from "../../../lib/db/abstract.repository.js";
import { Post, type IPost } from "../model/post.model.js";

class PostRepository extends AbstractRepository<IPost> {
    constructor() {
        super(Post);
    }
}

export const postRepository = new PostRepository();
