// Audit fixture: NestJS-style decorated class
// Tests: decorators don't break extraction, class + methods still parse

// Simulated decorator functions (decorators are just functions)
function Controller(_path: string): ClassDecorator { return (target) => target; }
function Injectable(): ClassDecorator { return (target) => target; }
function Get(_path?: string): MethodDecorator { return (_t, _k, d) => d; }
function Post(_path?: string): MethodDecorator { return (_t, _k, d) => d; }
function Put(_path?: string): MethodDecorator { return (_t, _k, d) => d; }
function Delete(_path?: string): MethodDecorator { return (_t, _k, d) => d; }
function Param(_name: string): ParameterDecorator { return () => {}; }
function Body(): ParameterDecorator { return () => {}; }
function Query(_name: string): ParameterDecorator { return () => {}; }
function UseGuards(..._guards: unknown[]): MethodDecorator { return (_t, _k, d) => d; }
function Inject(_token: string): ParameterDecorator { return () => {}; }

export interface CreateUserDto {
  name: string;
  email: string;
}

export interface UpdateUserDto {
  name?: string;
  email?: string;
}

@Injectable()
export class UserService {
  private users = new Map<string, { name: string; email: string }>();

  findAll(): Array<{ name: string; email: string }> {
    return [...this.users.values()];
  }

  findOne(id: string): { name: string; email: string } | undefined {
    return this.users.get(id);
  }

  create(dto: CreateUserDto): string {
    const id = String(this.users.size + 1);
    this.users.set(id, dto);
    return id;
  }

  update(id: string, dto: UpdateUserDto): boolean {
    const existing = this.users.get(id);
    if (!existing) return false;
    this.users.set(id, { ...existing, ...dto });
    return true;
  }

  remove(id: string): boolean {
    return this.users.delete(id);
  }
}

@Controller("/users")
export class UserController {
  constructor(@Inject("UserService") private readonly userService: UserService) {}

  @Get()
  findAll(): Array<{ name: string; email: string }> {
    return this.userService.findAll();
  }

  @Get(":id")
  findOne(@Param("id") id: string): { name: string; email: string } | undefined {
    return this.userService.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateUserDto): string {
    return this.userService.create(dto);
  }

  @Put(":id")
  @UseGuards("AuthGuard")
  update(@Param("id") id: string, @Body() dto: UpdateUserDto): boolean {
    return this.userService.update(id, dto);
  }

  @Delete(":id")
  @UseGuards("AuthGuard")
  remove(@Param("id") id: string): boolean {
    return this.userService.remove(id);
  }
}
