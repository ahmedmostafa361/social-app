import {
    LoginDto,
    RegisterDto,
    SendOtpDto,
    VerifyAccountDto
} from "../dto/dto.js";

class AuthService {
    constructor() {}

    // contract register >> registerDTO
    async register(registerDto: RegisterDto): Promise<void> {

    }

    async login(loginDto: LoginDto): Promise<void> {

    }

    async sendOtp(sendOtpDto: SendOtpDto): Promise<void> {

    }

    async verifyAccount(verifyAccountDto: VerifyAccountDto): Promise<void> {

    }
}

// singleton
export default new AuthService();