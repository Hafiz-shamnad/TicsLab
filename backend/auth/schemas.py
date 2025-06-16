from pydantic import BaseModel, EmailStr, constr, validator

class RegisterSchema(BaseModel):
    email: EmailStr
    password: constr(min_length=8)
    full_name: str

    @validator("full_name")
    def name_must_be_letters(cls, v):
        if not v.replace(" ", "").isalpha():
            raise ValueError("Name must contain only letters")
        return v

class LoginSchema(BaseModel):
    email: EmailStr
    password: str
