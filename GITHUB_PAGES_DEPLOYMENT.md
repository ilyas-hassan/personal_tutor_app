# 🚀 GitHub Pages Deployment Guide

## Overview

This AI Personal Tutor app has been converted to run entirely in the browser using **WebLLM** and **Microsoft's Phi-3-mini** model. It requires **no API keys**, **no backend server**, and works completely client-side for maximum privacy and accessibility.

## ✨ Key Features

- **100% Free**: No API costs or subscriptions
- **Privacy-First**: All processing happens in your browser - no data sent to servers
- **No Setup Required**: Users just visit the URL and start learning
- **Open Source**: Powered by Microsoft's Phi-3-mini (3.8B parameters)
- **Cross-Platform**: Works on any device with a compatible browser

## 📋 Requirements

### For Users
- **Modern Browser** with WebGPU support:
  - Chrome 113+ (recommended)
  - Edge 113+
  - Opera 99+
- **Good Internet Connection** (for initial model download ~2.4GB)
- **Sufficient Device Memory** (8GB+ RAM recommended)

### For Deployment
- GitHub account
- Git installed on your computer

## 🚀 Deployment Steps

### Option 1: Deploy Your Own Copy (Recommended)

1. **Fork or Clone This Repository**
   ```bash
   git clone https://github.com/yourusername/personal_tutor_app.git
   cd personal_tutor_app
   ```

2. **Remove Old Python Files** (optional, for cleaner repo)
   ```bash
   # These files are no longer needed for the web version
   rm app.py requirements.txt tutor_sessions.db
   ```

3. **Commit the Web Version**
   ```bash
   git add .
   git commit -m "Deploy web version with WebLLM"
   git push origin main
   ```

4. **Enable GitHub Pages**
   - Go to your repository on GitHub
   - Click **Settings** → **Pages**
   - Under "Source", select **Deploy from a branch**
   - Select branch: **main** and folder: **/ (root)**
   - Click **Save**

5. **Wait for Deployment**
   - GitHub will build and deploy your site (usually takes 1-2 minutes)
   - Your site will be available at: `https://yourusername.github.io/personal_tutor_app/`

### Option 2: Use This Repository Directly

If you want to share the app without hosting your own copy:

Simply share this URL: `https://YOUR_GITHUB_USERNAME.github.io/personal_tutor_app/`

Users can access it directly without any setup!

## 📁 File Structure

```
personal_tutor_app/
├── index.html              # Main HTML file
├── styles.css              # Styling
├── app.js                  # Application logic with WebLLM
├── GITHUB_PAGES_DEPLOYMENT.md  # This file
├── README.md               # Project documentation
└── (old Python files - no longer needed)
```

## 🔧 Configuration Options

### Customizing the AI Model

By default, the app uses **Phi-3-mini-4k-instruct-q4f16_1-MLC**. To use a different model:

1. Open `app.js`
2. Find the model initialization (around line 108):
   ```javascript
   state.engine = await webllm.CreateMLCEngine(
       "Phi-3-mini-4k-instruct-q4f16_1-MLC",
   ```
3. Replace with another WebLLM-supported model:
   - `Llama-3-8B-Instruct-q4f32_1-MLC` (larger, more capable)
   - `TinyLlama-1.1B-Chat-v0.4-q4f16_1-MLC` (smaller, faster)
   - See [WebLLM Models](https://github.com/mlc-ai/web-llm#models) for full list

### Customizing the System Prompt

Edit the `SYSTEM_PROMPT` constant in `app.js` (starting at line 4) to change the AI's teaching style and behavior.

### Customizing the UI

- **Colors**: Edit CSS variables in `styles.css` (lines 8-20)
- **Fonts**: Change the Google Fonts import in `index.html`
- **Layout**: Modify the HTML structure in `index.html`

## 🌐 Custom Domain (Optional)

To use your own domain:

1. **Add a CNAME file** to your repository root:
   ```bash
   echo "yourdomain.com" > CNAME
   git add CNAME
   git commit -m "Add custom domain"
   git push
   ```

2. **Configure DNS**:
   - Add a CNAME record pointing to: `yourusername.github.io`
   - Or for apex domain, use A records pointing to GitHub's IPs:
     - 185.199.108.153
     - 185.199.109.153
     - 185.199.110.153
     - 185.199.111.153

3. **Enable HTTPS** in GitHub Pages settings

## 🔍 Troubleshooting

### "Browser Not Supported" Message
- **Solution**: Use Chrome 113+, Edge 113+, or Opera 99+
- Check WebGPU support at: https://webgpureport.org/

### Model Takes Too Long to Load
- **First Load**: The ~2.4GB model needs to download (one-time only)
- **Subsequent Loads**: Model is cached in browser, loads much faster
- **Tip**: Use a faster internet connection for initial download

### Out of Memory Errors
- **Solution**: Close other tabs and applications
- **Minimum**: 8GB RAM recommended
- **Consider**: Using a smaller model variant

### Page Not Loading After Deployment
- Wait 2-3 minutes after enabling GitHub Pages
- Clear browser cache and refresh
- Check GitHub Pages settings are correct
- Verify all files are in the repository root

### AI Responses Are Slow
- **Normal**: First response takes longer as model warms up
- **Hardware**: Faster GPU = faster responses
- **Solution**: Be patient, subsequent responses are faster

## 📊 Performance Tips

1. **Close Unnecessary Tabs**: Free up RAM and GPU resources
2. **Use Desktop/Laptop**: Better performance than mobile devices
3. **Good Hardware**: Dedicated GPU significantly improves speed
4. **Clear Cache**: If experiencing issues, clear browser cache

## 🔒 Privacy & Security

- **No Data Collection**: Everything runs locally in the browser
- **No API Keys**: No credentials needed or stored
- **No Server Logs**: GitHub Pages is static hosting only
- **Offline Capable**: After initial load, works without internet (except for page refresh)

## 🎓 Teaching Your Students

### For Educators Sharing This App:

1. **Share the Direct Link**: `https://yourusername.github.io/personal_tutor_app/`

2. **System Requirements**: Inform students they need:
   - Modern browser (Chrome/Edge recommended)
   - 8GB+ RAM
   - Good internet for first load

3. **First-Time Setup**:
   - First visit takes 5-10 minutes to download AI model
   - Subsequent visits load instantly from cache
   - Model stays cached even after closing browser

4. **Best Practices**:
   - Use on laptop/desktop for best experience
   - Keep the browser tab open during learning sessions
   - Export chat history before closing (using Export button)

## 🤝 Contributing

Want to improve the app? 

1. Fork the repository
2. Make your changes
3. Test thoroughly
4. Submit a pull request

## 📞 Support

### For Users:
- Check the troubleshooting section above
- Ensure browser compatibility
- Try a different browser if issues persist

### For Developers:
- Open an issue on GitHub
- Include browser version and error messages
- Provide reproduction steps

## 🎉 Success Indicators

Your deployment is successful when:

1. ✅ GitHub Pages shows as "Active" in Settings
2. ✅ URL loads without errors
3. ✅ Loading screen appears and progresses
4. ✅ AI model loads successfully
5. ✅ Can start a learning session and chat with the AI

## 📈 Future Enhancements

Potential improvements you can make:

- **Add Document Upload**: Implement client-side PDF parsing
- **Voice Input**: Add speech-to-text for accessibility
- **Progressive Web App**: Make it installable on mobile devices
- **Multiple Languages**: Add internationalization
- **Quiz Mode**: Implement automated assessments
- **Learning Analytics**: Track progress locally

## 📄 License

This project maintains the original MIT License. Feel free to:
- Use for personal or commercial projects
- Modify and distribute
- Share with students and colleagues

---

## 🎓 Ready to Deploy?

Follow the steps above and you'll have your AI tutor live in minutes!

**Questions?** Open an issue on GitHub or check the troubleshooting section.

**Happy Teaching! 🚀**
