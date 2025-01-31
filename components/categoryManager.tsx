"use client";

import React, { useEffect, useState } from "react";
import {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
} from "@/lib/category";
import { getUploadUrl } from "@/lib/upload";

export default function CategoryManager() {
  const [categories, setCategories] = useState<any[]>([]);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<any>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  useEffect(() => {
    const fetchCategories = async () => {
      const fetchedCategories = await getCategories();
      setCategories(fetchedCategories);
      setIsLoading(false);
    };
    fetchCategories();
  }, []);
  const handleFileUpload = async () => {
    if (!selectedFile) return null;
    setIsUploadingImage(true);
    try {
      const { success, result } = await getUploadUrl();
      if (!success) {
        alert("이미지 업로드 URL을 가져오는 데 실패했습니다.");
        return null;
      }
      const formData = new FormData();
      formData.append("file", selectedFile);
      const uploadResponse = await fetch(result.uploadURL, {
        method: "POST",
        body: formData,
      });
      if (!uploadResponse.ok) {
        alert("이미지 업로드에 실패했습니다.");
        return null;
      }
      const responseData = await uploadResponse.json();
      const fileUrl = responseData.result.variants.find((url: string) =>
        url.endsWith("/public")
      );
      if (!fileUrl) {
        alert("이미지 URL을 가져오는 데 실패했습니다.");
        return null;
      }
      return fileUrl;
    } catch (error) {
      alert("이미지 업로드 중 오류가 발생했습니다.");
      console.error(error);
      return null;
    } finally {
      setIsUploadingImage(false);
    }
  };
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-48">
        <div className="w-6 h-6 border-2 border-sky-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  return (
    <div>
      <div className="flex justify-end items-center">
        <button
          className="px-3 py-1 bg-sky-400 text-white rounded hover:bg-sky-500"
          onClick={() => {
            setSelectedCategory(null);
            setIsCategoryModalOpen(true);
          }}
        >
          새 카테고리 등록
        </button>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4 p-3 sm:p-4">
        {categories.map((category, index) => (
          <div
            key={`${category.idx}-${index}`}
            className="px-[0.5px] sm:px-1 sm:pb-1 flex flex-col border rounded-md overflow-hidden shadow-sm hover:shadow-lg hover:scale-105 transition-transform duration-300 cursor-pointer bg-white"
            onClick={() => {
              setSelectedCategory(category);
              setIsCategoryModalOpen(true);
            }}
          >
            {category.image ? (
              <img
                src={category.image}
                alt={category.name || "Category"}
                className="h-32 w-full object-contain bg-white"
              />
            ) : (
              <div className="h-28 bg-gray-200 flex items-center justify-center text-gray-500">
                이미지 없음
              </div>
            )}
            <div className="p-2 flex flex-col gap-1 flex-grow">
              <h3 className="text-sm font-bold text-gray-800 line-clamp-2">
                {category.name}
              </h3>
            </div>
          </div>
        ))}
      </div>
      {isCategoryModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
          onClick={() => setIsCategoryModalOpen(false)}
        >
          <div
            className="bg-white p-6 rounded shadow-md w-96"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold mb-4">
              {selectedCategory ? "카테고리 수정" : "새 카테고리 등록"}
            </h3>
            <h3 className="font-bold text-gray-700 my-2">카테고리 이름</h3>
            <input
              type="text"
              placeholder="카테고리 이름"
              value={selectedCategory?.name || ""}
              onChange={(e) =>
                setSelectedCategory({
                  ...selectedCategory,
                  name: e.target.value,
                })
              }
              className="border w-full p-2 mb-2"
            />
            <div className="mb-4 flex flex-col">
              <h3 className="font-bold text-gray-700 my-2">카테고리 이미지</h3>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                className="border w-full p-2"
              />
              {selectedCategory?.image && (
                <img
                  src={selectedCategory.image}
                  alt="이미지 미리보기"
                  className="mt-4 h-32 object-contain"
                />
              )}
            </div>
            <div className="flex justify-end gap-2">
              {selectedCategory && (
                <button
                  className="px-3 py-1 bg-rose-400 text-white rounded hover:bg-rose-500"
                  onClick={async () => {
                    if (!confirm("정말로 삭제할까요?")) return;
                    const result = await deleteCategory(selectedCategory.idx);
                    if (!result) {
                      alert(
                        "해당 카테고리에 포함된 상품을 먼저 삭제해야 합니다."
                      );
                      return;
                    }
                    const updatedCategories = await getCategories();
                    setCategories(updatedCategories);
                    setIsCategoryModalOpen(false);
                  }}
                >
                  삭제
                </button>
              )}
              <button
                className={`px-3 py-1 bg-teal-400 text-white rounded ${
                  isUploadingImage
                    ? "opacity-50 cursor-not-allowed"
                    : "hover:bg-teal-500"
                }`}
                onClick={async () => {
                  const imageUrl = selectedFile
                    ? await handleFileUpload()
                    : null;
                  const updatedCategory = {
                    ...selectedCategory,
                    image: imageUrl || selectedCategory?.image || null,
                  };

                  if (selectedCategory?.idx) {
                    await updateCategory(selectedCategory.idx, updatedCategory);
                  } else {
                    await createCategory(updatedCategory);
                  }
                  const updatedCategories = await getCategories();
                  setCategories(updatedCategories);
                  setIsCategoryModalOpen(false);
                }}
                disabled={isUploadingImage}
              >
                {selectedCategory?.idx ? "수정" : "등록"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
