#!/usr/bin/env python3
"""
Script para actualizar contraseñas de todos los usuarios
Patrón: username + "1" (ej: admin.demo -> admin.demo1)
"""

import bcrypt

# Lista de usuarios con sus contraseñas deseadas
users_passwords = {
    "admin.demo": "admin.demo1",
    "contador.demo": "contador.demo1", 
    "jefe.bodega": "jefe.bodega1",
    "vendedor.centro": "vendedor.centro1",
    "vendedor.mall": "vendedor.mall1",
    "cajero.demo": "cajero.demo1",
    "consultor.demo": "consultor.demo1",
    "supervisor.demo": "supervisor.demo1"
}

def generate_password_hashes():
    """
    Generar hashes bcrypt para todas las contraseñas
    """
    print("🔐 GENERANDO HASHES DE CONTRASEÑAS")
    print("=" * 60)
    
    hashes = {}
    
    for username, password in users_passwords.items():
        try:
            # Generar hash bcrypt
            password_bytes = password.encode('utf-8')
            salt = bcrypt.gensalt(rounds=12)
            password_hash = bcrypt.hashpw(password_bytes, salt)
            password_hash_str = password_hash.decode('utf-8')
            
            # Verificar que el hash funciona
            test_verify = bcrypt.checkpw(password_bytes, password_hash)
            
            if test_verify:
                hashes[username] = {
                    "password": password,
                    "hash": password_hash_str,
                    "verified": True
                }
                print(f"✅ {username:20} -> {password:20} -> Hash OK")
            else:
                print(f"❌ {username:20} -> {password:20} -> Hash FALLO")
                
        except Exception as e:
            print(f"❌ {username:20} -> Error: {e}")
    
    return hashes

def generate_sql_script(hashes):
    """
    Generar script SQL para actualizar todas las contraseñas
    """
    sql_script = """-- =====================================================
-- SCRIPT DE ACTUALIZACIÓN MASIVA DE CONTRASEÑAS
-- Patrón: username + "1" (ej: admin.demo -> admin.demo1)
-- =====================================================

-- Respaldar contraseñas actuales
CREATE TABLE IF NOT EXISTS users_password_backup AS 
SELECT id, username, password_hash, NOW() as backup_date 
FROM users 
WHERE username IN ({user_list});

-- Actualizar contraseñas
""".format(
        user_list="'" + "', '".join(users_passwords.keys()) + "'"
    )
    
    for username, data in hashes.items():
        if data["verified"]:
            sql_script += f"""
UPDATE users 
SET 
    password_hash = '{data["hash"]}',
    password_changed_at = NOW(),
    updated_at = NOW()
WHERE username = '{username}';
"""
    
    sql_script += """
-- Verificar actualizaciones
SELECT 
    username, 
    password_changed_at,
    updated_at,
    CASE 
        WHEN password_changed_at >= DATE_SUB(NOW(), INTERVAL 1 MINUTE) 
        THEN '✅ ACTUALIZADO' 
        ELSE '❌ NO ACTUALIZADO' 
    END as status
FROM users 
WHERE username IN ({user_list})
ORDER BY username;

-- Limpiar backup si todo está OK (ejecutar manualmente)
-- DROP TABLE users_password_backup;
""".format(
        user_list="'" + "', '".join(users_passwords.keys()) + "'"
    )
    
    return sql_script

def generate_verification_script():
    """
    Generar script Python para verificar las contraseñas
    """
    verification_script = """#!/usr/bin/env python3
import bcrypt

# Verificar que todas las contraseñas funcionan
users_passwords = {
"""
    
    for username, password in users_passwords.items():
        verification_script += f'    "{username}": "{password}",\n'
    
    verification_script += """}

def verify_all_passwords():
    # Obtener hashes actuales de la BD (reemplazar con tus hashes reales)
    current_hashes = {
        # Agregar hashes de la BD después de la actualización
    }
    
    print("🔍 VERIFICANDO CONTRASEÑAS...")
    all_ok = True
    
    for username, password in users_passwords.items():
        if username in current_hashes:
            hash_str = current_hashes[username]
            try:
                is_valid = bcrypt.checkpw(password.encode('utf-8'), hash_str.encode('utf-8'))
                status = "✅ OK" if is_valid else "❌ FALLO"
                print(f"{status} {username:20} -> {password}")
                if not is_valid:
                    all_ok = False
            except Exception as e:
                print(f"❌ ERROR {username:20} -> {e}")
                all_ok = False
        else:
            print(f"⚠️  MISSING {username:20} -> Hash no encontrado")
    
    print(f"\\n{'✅ TODAS OK' if all_ok else '❌ HAY PROBLEMAS'}")
    return all_ok

if __name__ == "__main__":
    verify_all_passwords()
"""
    
    return verification_script

def main():
    """
    Función principal
    """
    print("🚀 GENERADOR DE CONTRASEÑAS PARA USUARIOS DEMO")
    print("=" * 60)
    print("Patrón: username + '1'")
    print("Ejemplos:")
    for username, password in list(users_passwords.items())[:3]:
        print(f"  {username} -> {password}")
    print("  ...")
    print()
    
    # Generar hashes
    hashes = generate_password_hashes()
    
    print(f"\\n📊 RESUMEN:")
    print(f"Total usuarios: {len(users_passwords)}")
    print(f"Hashes generados: {len(hashes)}")
    print(f"Hashes válidos: {sum(1 for h in hashes.values() if h['verified'])}")
    
    if len(hashes) == len(users_passwords):
        print("\\n" + "=" * 60)
        print("📋 TABLA DE CONTRASEÑAS GENERADAS")
        print("=" * 60)
        print(f"{'Username':<20} {'Password':<20} {'Status'}")
        print("-" * 60)
        
        for username, data in hashes.items():
            status = "✅ OK" if data["verified"] else "❌ ERROR"
            print(f"{username:<20} {data['password']:<20} {status}")
        
        print("\\n" + "=" * 60)
        print("🗄️  SCRIPT SQL PARA ACTUALIZACIÓN")
        print("=" * 60)
        sql_script = generate_sql_script(hashes)
        print(sql_script)
        
        print("\\n" + "=" * 60)
        print("🧪 SCRIPT DE VERIFICACIÓN")
        print("=" * 60)
        verification_script = generate_verification_script()
        print(verification_script)
        
    else:
        print("\\n❌ No se pudieron generar todos los hashes correctamente.")

if __name__ == "__main__":
    main()