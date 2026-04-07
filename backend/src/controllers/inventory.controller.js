import { Product } from "../models/product.models.js";

const addProduct = async (req, res) => {
  try {
    const { name, category, price, stock, threshold, description, salonId } = req.body;
    
    if (!name || !price || !salonId) {
      return res.status(400).json({ success: false, message: "Missing required fields" });
    }

    const product = await Product.create({
      name, category, price, stock, threshold, description, salon: salonId
    });

    return res.status(201).json({ success: true, data: product });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const getProductsBySalon = async (req, res) => {
  try {
    const { salonId } = req.params;
    const products = await Product.find({ salon: salonId }).sort({ name: 1 });
    return res.status(200).json({ success: true, data: products });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const updateProduct = async (req, res) => {
  try {
    const { productId } = req.params;
    const product = await Product.findByIdAndUpdate(productId, req.body, { new: true });
    if (!product) return res.status(404).json({ success: false, message: "Product not found" });
    return res.status(200).json({ success: true, data: product });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const deleteProduct = async (req, res) => {
  try {
    const { productId } = req.params;
    await Product.findByIdAndDelete(productId);
    return res.status(200).json({ success: true, message: "Product removed" });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export {
  addProduct,
  getProductsBySalon,
  updateProduct,
  deleteProduct
};
