import { IsEmail, IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

export class LoginDto {
  @IsEmail()
  @MaxLength(254)
  email: string;

  @IsString()
  @MinLength(5)
  @MaxLength(128)
  password: string;
}

export class GoogleLoginDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(10_000)
  idToken: string;
}

export class RefreshTokenDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(4_096)
  refreshToken: string;
}
