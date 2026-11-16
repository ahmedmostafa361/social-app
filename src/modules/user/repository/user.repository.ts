import { AbstractRepository } from "../../../lib/db/abstract.repository.js";
import { IUser } from "../interface/user.interface.js";
import { User } from "../model/user.model.js";

class UserRepository extends AbstractRepository<IUser> {
    constructor() {
        super(User);
    }

    async findByEmail(email: string) {
        return this.getOne({ email });
    }
}

// singleton
export default new UserRepository();