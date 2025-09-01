import React, { useState } from 'react';
import { useNavigate } from "react-router-dom";
import React, { useRef } from 'react';
import emailjs from '@emailjs/browser';

export default function sendInvite({ setActivePage }) {
  const form = useRef();

  const sendEmail = (e) => {
    e.preventDefault();

    emailjs.sendForm('YOUR_SERVICE_ID', 'YOUR_TEMPLATE_ID', form.current, 'YOUR_PUBLIC_KEY')
      .then((result) => {
          console.log(result.text);
          alert('Email sent successfully!');
      }, (error) => {
          console.log(error.text);
          alert('Failed to send email.');
      });
  };

  return (
    <form ref={form} onSubmit={sendEmail}>
      <label>Host Name</label>
      <input type="text" name="hostName" />
      <label>Message</label>
      <textarea name="message" />
      <label>Invite Template</label>
      <input type="file" name="template" id="inviteTemplate"></input>
      <input type="submit" value="Send" />
    </form>
  );
};