import { useState, useCallback, useMemo } from 'react';
import { QuotationItem, Quotation } from '../types';

const GST_RATE = 0.18; // 18% GST

export const useQuotationCalculator = () => {
  const [items, setItems] = useState<QuotationItem[]>([]);
  const [discount, setDiscount] = useState<number>(0);

  const addItem = useCallback((item: Omit<QuotationItem, 'id' | 'totalPrice'>) => {
    const totalPrice = item.unitPrice * item.quantity * item.duration;
    const newItem: QuotationItem = {
      ...item,
      id: `item-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      totalPrice,
    };
    setItems(prev => [...prev, newItem]);
  }, []);

  const updateItem = useCallback((id: string, updates: Partial<QuotationItem>) => {
    setItems(prev => prev.map(item => {
      if (item.id === id) {
        const updated = { ...item, ...updates };
        updated.totalPrice = updated.unitPrice * updated.quantity * updated.duration;
        return updated;
      }
      return item;
    }));
  }, []);

  const removeItem = useCallback((id: string) => {
    setItems(prev => prev.filter(item => item.id !== id));
  }, []);

  const clearItems = useCallback(() => {
    setItems([]);
    setDiscount(0);
  }, []);

  const calculations = useMemo(() => {
    const subtotal = items.reduce((sum, item) => sum + item.totalPrice, 0);
    const discountAmount = (subtotal * discount) / 100;
    const subtotalAfterDiscount = subtotal - discountAmount;
    const tax = subtotalAfterDiscount * GST_RATE;
    const total = subtotalAfterDiscount + tax;

    return {
      subtotal,
      discountAmount,
      discountPercent: discount,
      subtotalAfterDiscount,
      tax,
      total,
      itemCount: items.length,
    };
  }, [items, discount]);

  return {
    items,
    discount,
    setDiscount,
    addItem,
    updateItem,
    removeItem,
    clearItems,
    calculations,
  };
};
