const UserModel = require('../models/userModel');

const getAllUsers = (req, res) => {
  const users = UserModel.findAll();
  res.json({ success: true, count: users.length, data: users });
};

const getUserById = (req, res) => {
  const user = UserModel.findById(req.params.id);
  if (!user) {
    res.status(404);
    throw new Error(`User with id ${req.params.id} not found`);
  }
  res.json({ success: true, data: user });
};

const createUser = (req, res) => {
  const { name, email } = req.body;
  if (!name || !email) {
    res.status(400);
    throw new Error('name and email are required');
  }
  const user = UserModel.create({ name, email });
  res.status(201).json({ success: true, data: user });
};

const deleteUser = (req, res) => {
  const user = UserModel.deleteById(req.params.id);
  if (!user) {
    res.status(404);
    throw new Error(`User with id ${req.params.id} not found`);
  }
  res.json({ success: true, message: 'User deleted', data: user });
};

module.exports = { getAllUsers, getUserById, createUser, deleteUser };
