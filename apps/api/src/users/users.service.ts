import { BadRequestException, Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import * as bcrypt from 'bcryptjs';
import { Model } from 'mongoose';
import { CreateUserDto } from './dto';
import { User } from './user.schema';

@Injectable()
export class UsersService implements OnModuleInit {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<User>,
    private readonly config: ConfigService,
  ) {}

  async onModuleInit() {
    const email =
      this.config.get<string>('ADMIN_INITIAL_EMAIL')?.trim().toLowerCase() ||
      this.config.get<string>('ADMIN_EMAILS')?.split(',')[0]?.trim().toLowerCase();
    const password = this.config.get<string>('ADMIN_INITIAL_PASSWORD');

    if (!email || !password) return;

    const existingAdmin = await this.userModel.findOne({ role: 'ADMIN' }).lean();
    if (existingAdmin) return;

    await this.userModel.create({
      name: this.config.get<string>('ADMIN_INITIAL_NAME', 'Carsale Administrator'),
      email,
      passwordHash: await bcrypt.hash(password, 12),
      role: 'ADMIN',
      active: true,
    });
  }

  async findForLogin(email: string) {
    return this.userModel.findOne({ email: email.trim().toLowerCase() }).select('+passwordHash');
  }

  async findActiveById(id: string) {
    return this.userModel.findOne({ _id: id, active: true }).lean();
  }

  async findOrCreateGoogleUser(input: { googleSubject: string; email: string; name: string }) {
    const email = input.email.trim().toLowerCase();
    const existing = await this.userModel.findOne({
      $or: [{ googleSubject: input.googleSubject }, { email }],
    });

    if (existing) {
      existing.googleSubject = input.googleSubject;
      if (!existing.name) existing.name = input.name.trim();
      return { user: await existing.save(), created: false };
    }

    return {
      user: await this.userModel.create({
        name: input.name.trim(),
        email,
        googleSubject: input.googleSubject,
        role: 'USER',
        active: false,
      }),
      created: true,
    };
  }

  async findAll() {
    return this.userModel.find().sort({ role: 1, createdAt: -1 }).lean();
  }

  async createUser(dto: CreateUserDto) {
    const email = dto.email.trim().toLowerCase();
    const existing = await this.userModel.exists({ email });
    if (existing) throw new BadRequestException('A user with this email already exists');

    return this.userModel.create({
      name: dto.name.trim(),
      email,
      passwordHash: await bcrypt.hash(dto.password, 12),
      role: 'USER',
      active: true,
    });
  }

  async setActive(id: string, active: boolean) {
    const user = await this.userModel.findById(id);
    if (!user) throw new NotFoundException('User not found');
    if (user.role === 'ADMIN' && !active) {
      throw new BadRequestException('The administrator account cannot be deactivated');
    }
    user.active = active;
    return user.save();
  }
}
