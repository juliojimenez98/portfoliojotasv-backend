import { Router, Request, Response } from 'express';
import { getRatesForCLP, getExchangeRate, SUPPORTED_CURRENCIES } from '../services/currency.service';
import { protect, authorize } from '../middlewares/auth';

const router = Router();

router.use(protect);
router.use(authorize('gastos'));

// @route   GET /api/currency/rates
// @desc    Get all exchange rates relative to CLP
// @access  Private
router.get('/rates', async (req: Request, res: Response) => {
  try {
    const rates = await getRatesForCLP();
    res.status(200).json({ success: true, data: rates });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || 'Failed to fetch exchange rates' });
  }
});

// @route   GET /api/currency/convert
// @desc    Convert amount from one currency to CLP
// @access  Private
router.get('/convert', async (req: Request, res: Response) => {
  const { from, amount } = req.query;

  if (!from || !amount) {
    return res.status(400).json({ success: false, error: 'from and amount are required' });
  }

  try {
    const rate = await getExchangeRate(from as string, 'CLP');
    const amountCLP = Math.round(parseFloat(amount as string) * rate);

    res.status(200).json({
      success: true,
      data: {
        from,
        to: 'CLP',
        originalAmount: parseFloat(amount as string),
        exchangeRate: rate,
        convertedAmount: amountCLP,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || 'Conversion failed' });
  }
});

// @route   GET /api/currency/supported
// @desc    Get list of supported currencies
// @access  Private
router.get('/supported', (req: Request, res: Response) => {
  res.status(200).json({ success: true, data: SUPPORTED_CURRENCIES });
});

export default router;
