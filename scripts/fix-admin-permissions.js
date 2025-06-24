ss// 修复管理员权限测试脚本
const mysql = require('mysql2/promise');

async function fixAdminPermissions() {
  let connection;
  
  try {
    // 连接数据库
    connection = await mysql.createConnection({
      host: '156.226.176.148',
      user: 'tc',
      password: 'aNMEFHXJ55Nkf77K',
      database: 'tc'
    });

    console.log('Connected to database successfully');

    // 查看所有用户
    const [users] = await connection.execute("SELECT id, name, email, is_adminer FROM users ORDER BY created_at ASC");
    console.log('\n当前用户列表:');
    console.log(users);

    // 如果第一个用户不是管理员，设置为管理员
    if (users.length > 0) {
      const firstUser = users[0];
      if (!firstUser.is_adminer) {
        await connection.execute("UPDATE users SET is_adminer = 1 WHERE id = ?", [firstUser.id]);
        console.log(`\n✅ 已将第一个用户 ${firstUser.name} (${firstUser.email}) 设置为管理员`);
      } else {
        console.log(`\n✅ 第一个用户 ${firstUser.name} (${firstUser.email}) 已经是管理员`);
      }
    }

    // 再次查看更新后的用户状态
    const [updatedUsers] = await connection.execute("SELECT id, name, email, is_adminer FROM users ORDER BY created_at ASC");
    console.log('\n更新后的用户列表:');
    console.log(updatedUsers);

    // 测试管理员检查查询
    const adminUser = users.find(u => u.is_adminer === 1);
    if (adminUser) {
      const [adminCheck] = await connection.execute(
        "SELECT name, email, is_adminer FROM users WHERE id = ? AND is_adminer = 1",
        [adminUser.id]
      );
      console.log('\n管理员权限检查:');
      console.log(adminCheck);
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

fixAdminPermissions();
