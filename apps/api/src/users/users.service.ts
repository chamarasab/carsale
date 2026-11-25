import { BadRequestException, Injectable, Logger, NotFoundException, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import * as bcrypt from 'bcryptjs';
import { Model } from 'mongoose';
import { getAdminEmails } from '../config/admin-emails';
import { isMongoStorageQuotaError } from '../config/mongo-errors';
import { CreateUserDto } from './dto';
import { User } from './user.schema';

@Injectable()
export class UsersService implements OnModuleInit {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    @InjectModel(User.name) private readonly userModel: Model<User>,
    private readonly config: ConfigService,
  ) {}

  async onModuleInit() {
    await this.runStartupWrite('drop legacy single-admin index', () =>
      this.removeSingleAdminConstraint(),
    );

    const adminEmails = getAdminEmails(this.config);
    if (adminEmails.length) {
      const pendingPromotion = await this.userModel.exists({
        email: { $in: adminEmails },
        $or: [{ role: { $ne: 'ADMIN' } }, { active: { $ne: true } }],
      });
      if (pendingPromotion) {
        await this.runStartupWrite('promote configured administrator accounts', () =>
          this.userModel.updateMany(
            {
              email: { $in: adminEmails },
              $or: [{ role: { $ne: 'ADMIN' } }, { active: { $ne: true } }],
            },
            { $set: { role: 'ADMIN', active: true } },
          ),
        );
      }
    }

    const email =
      this.config.get<string>('ADMIN_INITIAL_EMAIL')?.trim().toLowerCase() ||
      adminEmails[0];
    const password = this.config.get<string>('ADMIN_INITIAL_PASSWORD');

    if (!email || !password) return;

    const existingAdmin = await this.userModel.findOne({ role: 'ADMIN' }).lean();
    if (existingAdmin) return;

    await this.runStartupWrite('seed initial administrator account', async () =>
      this.userModel.create({
        name: this.config.get<string>('ADMIN_INITIAL_NAME', 'Carsale Administrator'),
        email,
        passwordHash: await bcrypt.hash(password, 12),
        role: 'ADMIN',
        active: true,
      }),
    );
  }

  async findForLogin(email: string) {
    return this.userModel.findOne({ email: email.trim().toLowerCase() }).select('+passwordHash');
  }

  async findActiveById(id: string) {
    return this.userModel.findOne({ _id: id, active: true }).lean();
  }

  async findOrCreateGoogleUser(input: { googleSubject: string; email: string; name: string }) {
    const email = input.email.trim().toLowerCase();
    const isAdmin = getAdminEmails(this.config).includes(email);
    const existing = await this.userModel.findOne({
      $or: [{ googleSubject: input.googleSubject }, { email }],
    });

    if (existing) {
      const trimmedName = input.name.trim();
      let changed = false;
      if (existing.googleSubject !== input.googleSubject) {
        existing.googleSubject = input.googleSubject;
        changed = true;
      }
      if (!existing.name && trimmedName) {
        existing.name = trimmedName;
        changed = true;
      }
      if (isAdmin) {
        if (existing.role !== 'ADMIN') {
          existing.role = 'ADMIN';
          changed = true;
        }
        if (!existing.active) {
          existing.active = true;
          changed = true;
        }
      }
      return { user: changed ? await existing.save() : existing, created: false };
    }

    return {
      user: await this.userModel.create({
        name: input.name.trim(),
        email,
        googleSubject: input.googleSubject,
        role: isAdmin ? 'ADMIN' : 'USER',
        active: isAdmin,
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

  private async runStartupWrite(action: string, operation: () => Promise<unknown>) {
    try {
      await operation();
    } catch (error) {
      if (isMongoStorageQuotaError(error)) {
        this.logger.warn(`Skipping "${action}" during startup because MongoDB storage quota is exceeded`);
        return;
      }
      throw error;
    }
  }

  private async removeSingleAdminConstraint() {
    try {
      const indexes = await this.userModel.collection.indexes();
      const legacyIndexName = indexes.find((index) => index.name === 'role_1' && index.unique === true)?.name;
      if (legacyIndexName) await this.userModel.collection.dropIndex(legacyIndexName);
    } catch (error) {
      const mongoError = error as { code?: number; codeName?: string };
      if (mongoError.code !== 26 && mongoError.codeName !== 'NamespaceNotFound') throw error;
    }
  }
}
