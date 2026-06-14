import { IsEmail, IsMongoId, IsOptional, IsString, Length } from 'class-validator';

export class CreateInquiryDto {
  @IsMongoId()
  carId: string;

  @IsString()
  @Length(2, 80)
  name: string;

  @IsEmail()
  email: string;

  @IsString()
  @Length(7, 20)
  phone: string;

  @IsOptional()
  @IsString()
  @Length(0, 1000)
  message?: string;
}
