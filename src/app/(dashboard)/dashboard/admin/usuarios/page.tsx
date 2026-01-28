'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { Plus, Search, Edit2, Trash2, Shield, User as UserIcon, RefreshCw, Circle, Package, Store, FileText } from 'lucide-react';
import { useAuth, useTableSubscription } from '@/contexts';
import { useToast } from '@/hooks/use-toast';
import { User } from '@/types';
import { USER_ROLES, ROUTES, SUCCESS_MESSAGES, ERROR_MESSAGES } from '@/lib/constants';
import { formatDateTime } from '@/lib/utils';
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Badge,
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui';
import { CreateUserDialog } from '@/components/admin/create-user-dialog';
import { EditUserDialog } from '@/components/admin/edit-user-dialog';
import { useRouter } from 'next/navigation';

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  
  const { user: currentUser } = useAuth();
  const { toast } = useToast();
  const router = useRouter();

  // Verificar rol admin
  useEffect(() => {
    if (currentUser && currentUser.role !== USER_ROLES.ADMIN) {
      router.push(ROUTES.DASHBOARD);
    }
  }, [currentUser, router]);

  // Cargar usuarios usando la API
  const fetchUsers = useCallback(async () => {
    try {
      const response = await fetch('/api/users');
      const data = await response.json();
      
      if (data.users) {
        setUsers(data.users);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      toast({
        title: 'Error',
        description: 'No se pudieron cargar los usuarios',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  // Cargar usuarios al montar
  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Realtime centralizado para usuarios y presencia
  const isConnected = useTableSubscription('users', fetchUsers);
  useTableSubscription('user_presence', fetchUsers);

  // Filtrar usuarios con useMemo
  const filteredUsers = useMemo(() => {
    if (!searchQuery.trim()) return users;
    const query = searchQuery.toLowerCase();
    return users.filter(u =>
      u.username.toLowerCase().includes(query) ||
      u.fullName.toLowerCase().includes(query)
    );
  }, [searchQuery, users]);

  // Eliminar usuario
  const handleDelete = async () => {
    if (!selectedUser) return;

    try {
      setIsDeleting(true);

      // No permitir eliminar al usuario actual
      if (selectedUser.id === currentUser?.id) {
        toast({
          title: 'Error',
          description: 'No puedes eliminar tu propio usuario',
          variant: 'destructive',
        });
        return;
      }

      // Usar la API para eliminar el usuario
      const response = await fetch(`/api/users?id=${selectedUser.id}`, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Error al eliminar');
      }

      toast({
        title: 'Éxito',
        description: SUCCESS_MESSAGES.DELETED,
        variant: 'success',
      });
      
      // Recargar lista
      fetchUsers();
    } catch (error) {
      console.error('Error deleting user:', error);
      toast({
        title: 'Error',
        description: ERROR_MESSAGES.GENERIC,
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
      setDeleteDialogOpen(false);
      setSelectedUser(null);
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case USER_ROLES.ADMIN:
        return (
          <Badge variant="default" className="gap-1">
            <Shield className="h-3 w-3" />
            Admin
          </Badge>
        );
      case USER_ROLES.USER:
        return (
          <Badge variant="secondary" className="gap-1">
            <UserIcon className="h-3 w-3" />
            Usuario
          </Badge>
        );
      default:
        return null;
    }
  };

  const getStatusBadge = (isActive: boolean) => {
    return isActive ? (
      <Badge variant="success">Activo</Badge>
    ) : (
      <Badge variant="destructive">Inactivo</Badge>
    );
  };

  const getOnlineIndicator = (isOnline: boolean) => {
    return (
      <Circle 
        className={`h-2.5 w-2.5 ${isOnline ? 'fill-green-500 text-green-500' : 'fill-gray-300 text-gray-300'}`} 
      />
    );
  };

  const getPermissionsBadges = (permissions?: { inventario?: boolean; tiendas?: boolean; cotizaciones?: boolean }) => {
    if (!permissions) return null;
    return (
      <div className="flex gap-1">
        {permissions.inventario && (
          <Badge variant="outline" className="text-xs px-1.5 py-0 gap-0.5">
            <Package className="h-3 w-3" />
          </Badge>
        )}
        {permissions.tiendas && (
          <Badge variant="outline" className="text-xs px-1.5 py-0 gap-0.5">
            <Store className="h-3 w-3" />
          </Badge>
        )}
        {permissions.cotizaciones && (
          <Badge variant="outline" className="text-xs px-1.5 py-0 gap-0.5">
            <FileText className="h-3 w-3" />
          </Badge>
        )}
      </div>
    );
  };

  if (currentUser?.role !== USER_ROLES.ADMIN) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Usuarios</h1>
          <p className="text-muted-foreground">
            Gestiona los usuarios del sistema
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className={`flex items-center gap-1 text-xs ${isConnected ? 'text-green-500' : 'text-muted-foreground'}`}>
            <RefreshCw className={`h-3 w-3 ${isConnected ? '' : 'animate-spin'}`} />
            {isConnected ? 'Tiempo real' : 'Conectando...'}
          </div>
          <Button onClick={() => setCreateDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Nuevo Usuario
          </Button>
        </div>
      </div>

      {/* Búsqueda */}
      <Card className="shadow-soft">
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por usuario o nombre..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Lista de usuarios */}
      <Card className="shadow-soft">
        <CardHeader>
          <CardTitle>Lista de Usuarios</CardTitle>
          <CardDescription>
            {filteredUsers.length} usuario(s) encontrado(s)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No se encontraron usuarios
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-2 font-medium text-muted-foreground w-8">
                      
                    </th>
                    <th className="text-left py-3 px-2 font-medium text-muted-foreground">
                      Usuario
                    </th>
                    <th className="text-left py-3 px-2 font-medium text-muted-foreground hidden sm:table-cell">
                      Nombre Completo
                    </th>
                    <th className="text-left py-3 px-2 font-medium text-muted-foreground">
                      Rol
                    </th>
                    <th className="text-left py-3 px-2 font-medium text-muted-foreground hidden md:table-cell">
                      Permisos
                    </th>
                    <th className="text-left py-3 px-2 font-medium text-muted-foreground hidden md:table-cell">
                      Estado
                    </th>
                    <th className="text-left py-3 px-2 font-medium text-muted-foreground hidden lg:table-cell">
                      Último Acceso
                    </th>
                    <th className="text-right py-3 px-2 font-medium text-muted-foreground">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((user) => (
                    <tr key={user.id} className="border-b last:border-0 hover:bg-muted/50">
                      <td className="py-3 px-2">
                        {getOnlineIndicator(user.isOnline || false)}
                      </td>
                      <td className="py-3 px-2">
                        <div className="flex flex-col">
                          <span className="font-medium">{user.username}</span>
                          <span className="text-sm text-muted-foreground sm:hidden">
                            {user.fullName}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-2 hidden sm:table-cell">
                        {user.fullName}
                      </td>
                      <td className="py-3 px-2">{getRoleBadge(user.role)}</td>
                      <td className="py-3 px-2 hidden md:table-cell">
                        {getPermissionsBadges(user.permissions)}
                      </td>
                      <td className="py-3 px-2 hidden md:table-cell">
                        {getStatusBadge(user.isActive)}
                      </td>
                      <td className="py-3 px-2 text-sm text-muted-foreground hidden lg:table-cell">
                        {user.lastLogin ? formatDateTime(user.lastLogin) : 'Nunca'}
                      </td>
                      <td className="py-3 px-2">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setSelectedUser(user);
                              setEditDialogOpen(true);
                            }}
                          >
                            <Edit2 className="h-4 w-4" />
                            <span className="sr-only">Editar</span>
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:text-destructive"
                            onClick={() => {
                              setSelectedUser(user);
                              setDeleteDialogOpen(true);
                            }}
                            disabled={user.id === currentUser?.id}
                          >
                            <Trash2 className="h-4 w-4" />
                            <span className="sr-only">Eliminar</span>
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialogs */}
      <CreateUserDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSuccess={fetchUsers}
      />

      {selectedUser && (
        <EditUserDialog
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          user={selectedUser}
          onSuccess={fetchUsers}
        />
      )}

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar usuario?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Se eliminará permanentemente al
              usuario <strong>@{selectedUser?.username}</strong> del sistema.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? 'Eliminando...' : 'Eliminar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
