"use server";
import { revalidatePath } from "next/cache";
import Product from "../models/product.model";
import { connectToDB } from "../mongoose";
import { scrapeAmazonProduct } from "../scrapper";
import { getAveragePrice, getHighestPrice, getLowestPrice } from "../utils";
import { User } from "@/types";
import { generateEmailBody, sendEmail } from "../nodemailer";
import { redirect } from "next/navigation";

export async function scrapeAndStoreProduct(productUrl: string) {
  if (!productUrl) return;
  let newProduct;
  try {
    connectToDB();
    const scrapedProduct = await scrapeAmazonProduct(productUrl);
    if (!scrapedProduct) return;
    let product = scrapedProduct;
    const existingProduct = await Product.findOne({ url: scrapedProduct.url });
    if (existingProduct) {
      const updatedPriceHistory: any = [
        ...existingProduct.priceHistory,
        { price: scrapedProduct.currentPrice },
      ];
      product = {
        ...scrapedProduct,
        priceHistory: updatedPriceHistory,
        highestPrice: getHighestPrice(updatedPriceHistory),
        lowestPrice: getLowestPrice(updatedPriceHistory),
        averagePrice: getAveragePrice(updatedPriceHistory),
      };
    }
     newProduct = await Product.findOneAndUpdate(
      { url: scrapedProduct.url },
      product,
      { upsert: true, new: true }
    );
    revalidatePath(`/products/${newProduct._id}`);
  
  } catch (error: any) {
    throw new Error(`Failed to create/update product: ${error.message}`);
  }
  
    redirect(`/products/${newProduct?._id}`)
}

export async function getProductId(productId: string) {
  try {
    connectToDB();
    const product = await Product.findOne({ _id: productId });
    if (!product) return null;
    return product;
  } catch (error) {}
}

export async function getAllProducts() {
  try {
    connectToDB();
    const product = await Product.find();
    return product;
  } catch (error) {}
}
export async function getSimilarProduct(productId: string) {
  try {
    connectToDB();
    const currentProduct = await Product.findById(productId);
    if (!currentProduct) return null;

    const similarProduct = await Product.find({
      _id: { $ne: productId },
    }).limit(3);
    return similarProduct;
  } catch (error) {}
}

export async function addUserEmailToProduct(
  productId: string,
  userEmail: string
) {
  try {
    const product = await Product.findById(productId);
    if (!product) return;
    const userExist = product.users.some(
      (user: User) => user.email === userEmail
    );
    if (!userExist) {
      product.users.push({ email: userEmail });
      await product.save();
      const emailContent = await generateEmailBody(product, "WELCOME");
      await sendEmail(emailContent, [userEmail]);
    }
    //send our first email
  } catch (error) {
    console.log(error);
  }
}
