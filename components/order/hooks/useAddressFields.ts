"use client";

import { useEffect, useState } from "react";

export function useAddressFields() {
  const [detailAddress, setDetailAddress] = useState("");
  const [requestNotes, setRequestNotes] = useState("");
  const [entrancePassword, setEntrancePassword] = useState("");
  const [directions, setDirections] = useState("");

  useEffect(() => {
    const storedDetailAddress = localStorage.getItem("detailAddress");
    const storedRequestNotes = localStorage.getItem("requestNotes");
    const storedEntrancePassword = localStorage.getItem("entrancePassword");
    const storedDirections = localStorage.getItem("directions");
    if (storedDetailAddress) setDetailAddress(storedDetailAddress);
    if (storedRequestNotes) setRequestNotes(storedRequestNotes);
    if (storedEntrancePassword) setEntrancePassword(storedEntrancePassword);
    if (storedDirections) setDirections(storedDirections);
  }, []);

  useEffect(() => {
    localStorage.setItem("detailAddress", detailAddress);
  }, [detailAddress]);
  useEffect(() => {
    localStorage.setItem("requestNotes", requestNotes);
  }, [requestNotes]);
  useEffect(() => {
    localStorage.setItem("entrancePassword", entrancePassword);
  }, [entrancePassword]);
  useEffect(() => {
    localStorage.setItem("directions", directions);
  }, [directions]);

  return {
    detailAddress,
    setDetailAddress,
    requestNotes,
    setRequestNotes,
    entrancePassword,
    setEntrancePassword,
    directions,
    setDirections,
  };
}

