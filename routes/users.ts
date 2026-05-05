// import { Router, Request, Response } from 'express';
// import { usersRepository } from '../storage';

// const router = Router();

// // Get all users
// router.get('/', async (_req: Request, res: Response) => {
//   try {
//     const allUsers = await usersRepository.findAll();
//     res.json(allUsers);
//   } catch (error) {
//     console.error('Error fetching users:', error);
//     res.status(500).json({ error: 'Failed to fetch users' });
//   }
// });

// // Create a user
// router.post('/', async (req: Request, res: Response) => {
//   try {
//     const { name, email } = req.body;

//     if (!name || !email) {
//       return res.status(400).json({ error: 'Name and email are required' });
//     }

//     const newUser = await usersRepository.create({ name, email });
//     res.status(201).json(newUser);
//   } catch (error) {
//     console.error('Error creating user:', error);
//     res.status(500).json({ error: 'Failed to create user' });
//   }
// });

// // Get user by ID
// router.get('/:id', async (req: Request, res: Response) => {
//   try {
//     const userId = parseInt(req.params.id);
//     const user = await usersRepository.findById(userId);

//     if (!user) {
//       return res.status(404).json({ error: 'User not found' });
//     }

//     res.json(user);
//   } catch (error) {
//     console.error('Error fetching user:', error);
//     res.status(500).json({ error: 'Failed to fetch user' });
//   }
// });

// // Delete user by ID
// router.delete('/:id', async (req: Request, res: Response) => {
//   try {
//     const userId = parseInt(req.params.id);
//     const deleted = await usersRepository.delete(userId);

//     if (!deleted) {
//       return res.status(404).json({ error: 'User not found' });
//     }

//     res.json({ message: 'User deleted successfully' });
//   } catch (error) {
//     console.error('Error deleting user:', error);
//     res.status(500).json({ error: 'Failed to delete user' });
//   }
// });

// export default router;
