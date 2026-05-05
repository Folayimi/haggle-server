import { Router, Request, Response } from 'express';
import { postsRepository } from '../storage';

const router = Router();

// Get posts for a user
router.get('/user/:userId', async (req: Request, res: Response) => {
  try {
    const userId = parseInt(req.params.userId);
    const userItems = await postsRepository.findByUserId(userId);
    res.json(userItems);
  } catch (error) {
    console.error('Error fetching items:', error);
    res.status(500).json({ error: 'Failed to fetch items' });
  }
});

// Create an item
router.post('/', async (req: Request, res: Response) => {
  try {
    const { title, description, content, price, userId } = req.body;

    if (!title || !userId) {
      return res.status(400).json({ error: 'Title and userId are required' });
    }

    const newItem = await postsRepository.create({
      title,
      description,
      content,
      price,
      userId,
    });

    res.status(201).json(newItem);
  } catch (error) {
    console.error('Error creating item:', error);
    res.status(500).json({ error: 'Failed to create item' });
  }
});

// Get item by ID
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const itemId = parseInt(req.params.id);
    const item = await postsRepository.findById(itemId);

    if (!item) {
      return res.status(404).json({ error: 'Item not found' });
    }

    res.json(item);
  } catch (error) {
    console.error('Error fetching item:', error);
    res.status(500).json({ error: 'Failed to fetch item' });
  }
});

// Delete item by ID
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const itemId = parseInt(req.params.id);
    const deleted = await postsRepository.delete(itemId);

    if (!deleted) {
      return res.status(404).json({ error: 'Item not found' });
    }

    res.json({ message: 'Item deleted successfully' });
  } catch (error) {
    console.error('Error deleting item:', error);
    res.status(500).json({ error: 'Failed to delete item' });
  }
});

export default router;
