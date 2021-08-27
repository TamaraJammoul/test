
import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from 'src/enums/role.enum';
import { ROLES_KEY } from './roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    // if there is role return true
    if (!requiredRoles) {    
      return true;
    }
    const { user } = context.switchToHttp().getRequest();
    // if user does not login, return false
    if (!user) return false;
    return (user.role == Role.Admin ||  requiredRoles.some((role) => user.role == role));
  }
}