// shape or contract User
import { Gender, Provider } from "../../auth/enum/enum.js";
export interface IUser {
    userName: string;
    email: string;
    password?: string;
    provider: Provider;
    gender: Gender;
}