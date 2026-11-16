import { AbstractRepository } from "../../../lib/db/abstract.repository.js";
import { IPost, Post } from "../model/post.model.js";

class PostRepository extends AbstractRepository<IPost> {
    constructor() {
        super(Post);
    }
}

// singleton
export default new PostRepository();