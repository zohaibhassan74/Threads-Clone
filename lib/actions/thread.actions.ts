'use server'
import { connectToDB } from "../mongoose";
import Thread from "../models/thread.model";
import User from "../models/user.model";
import { revalidatePath } from "next/cache";
import { path } from 'path';

interface Params {
    text: string;
    author: string;
    communityId : string | null;
    path : string
 }


export async function createThread({ text, author, communityId, path }: Params) {
    
    try {
        connectToDB();

    const createThread = await Thread.create({
        text,
        author,
        community: null,
    })

    await User.findByIdAndUpdate(author, {
        $push: { threads: createThread._id },
    })

    revalidatePath(path)
    } catch (error: any) {
        throw new Error(`Error Creating thread: ${error.message}`)
    }
    
}

export async function fetchPosts(pageNumber=1, pageSize=2) {
        connectToDB();
        const skipAmount = pageSize * (pageNumber - 1)
        //Fetch posts who have no parents(top level threads)
        const postQuery = await Thread.find({
            parentId: {
                $in: [null, undefined],
            }})
            .sort({ createdAt: 'desc' }) // New one will comes up first
            .skip(skipAmount)
            .limit(pageSize)
            .populate({ path: 'author', model: User })
            .populate({
                path: 'children', populate: {
                    path: 'author', model: User,
                    select:"_id name parentId image"
                }})
                
        const totalPosts = await Thread.countDocuments({ parentId: { $in: [null, undefined] } })
     const posts = await postQuery;
     const isNextPage = totalPosts > pageSize * pageNumber
     return { posts, isNextPage }
    }
