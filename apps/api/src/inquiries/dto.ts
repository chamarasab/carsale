import { IsEmail, IsMongoId, IsOptional, IsString, Length, MaxLength } from 'class-validator';

export class CreateInquiryDto {
  @IsMongoId()
  carId: string;

  @IsString()
  @Length(2, 80)
  name: string;

  @IsEmail()
  @MaxLength(254)
  email: string;

  @IsString()
  @Length(7, 20)
  phone: string;

  @IsOptional()
  @IsString()
  @Length(0, 1000)
  message?: string;
}
