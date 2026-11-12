// In-memory user model (replace with DB like MongoDB/Prisma later)
let users = [
  { id: 1, name: 'Alice', email: 'alice@example.com' },
  { id: 2, name: 'Bob',   email: 'bob@example.com'   },
];

const UserModel = {
  findAll: () => users,

  findById: (id) => users.find((u) => u.id === parseInt(id)),

  create: (data) => {
    const user = { id: users.length + 1, ...data };
    users.push(user);
    return user;
  },

  deleteById: (id) => {
    const index = users.findIndex((u) => u.id === parseInt(id));
    if (index === -1) return null;
    const [deleted] = users.splice(index, 1);
    return deleted;
  },
};

module.exports = UserModel;
