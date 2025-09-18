import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './BlogSection.css';

const BlogSection = ({ user, userRole }) => {
  const [blogs, setBlogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedBlog, setSelectedBlog] = useState(null);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [likedBlogs, setLikedBlogs] = useState([]);
  const [replyingTo, setReplyingTo] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [lastFetch, setLastFetch] = useState(null);

  useEffect(() => {
    const now = Date.now();
    if (!lastFetch || now - lastFetch > 10 * 60 * 1000) {
      loadBlogs();
      if (userRole === 'mentee') {
        loadLikedBlogs();
      }
      setLastFetch(now);
    }
  }, [userRole, lastFetch]);

  const loadBlogs = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const url = userRole === 'mentor' 
        ? `/api/blogs/mentor/${user.id}`
        : '/api/blogs';
      
      const cacheKey = `blogs_${userRole}_${user.id}`;
      const cached = localStorage.getItem(cacheKey);
      const cacheTime = localStorage.getItem(`${cacheKey}_time`);
      
      if (cached && cacheTime && Date.now() - parseInt(cacheTime) < 10 * 60 * 1000) {
        setBlogs(JSON.parse(cached));
        setLoading(false);
        return;
      }
      
      const response = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const blogsData = response.data.blogs || [];
      setBlogs(blogsData);
      
      localStorage.setItem(cacheKey, JSON.stringify(blogsData));
      localStorage.setItem(`${cacheKey}_time`, Date.now().toString());
    } catch (error) {
      console.error('Failed to load blogs:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadLikedBlogs = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`/api/mentee/${user.id}/liked-blogs`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setLikedBlogs(response.data.likedBlogs || []);
    } catch (error) {
      console.error('Failed to load liked blogs:', error);
    }
  };

  const handleLike = async (blogId) => {
    if (userRole !== 'mentee') return;
    
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(`/api/blogs/${blogId}/like`, {
        menteeId: user.id
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.data.liked) {
        setLikedBlogs([...likedBlogs, blogId]);
        setBlogs(blogs.map(blog => 
          blog.id === blogId ? { ...blog, likes_count: blog.likes_count + 1 } : blog
        ));
      } else {
        setLikedBlogs(likedBlogs.filter(id => id !== blogId));
        setBlogs(blogs.map(blog => 
          blog.id === blogId ? { ...blog, likes_count: blog.likes_count - 1 } : blog
        ));
      }
    } catch (error) {
      console.error('Failed to like blog:', error);
    }
  };

  const loadComments = async (blogId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`/api/blogs/${blogId}/comments`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setComments(response.data.comments || []);
    } catch (error) {
      console.error('Failed to load comments:', error);
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) return;
    
    try {
      const token = localStorage.getItem('token');
      await axios.post(`/api/blogs/${selectedBlog.id}/comments`, {
        userId: user.id,
        content: newComment
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setNewComment('');
      loadComments(selectedBlog.id);
      setBlogs(blogs.map(blog => 
        blog.id === selectedBlog.id ? { ...blog, comments_count: blog.comments_count + 1 } : blog
      ));
      
      const cacheKey = `blogs_${userRole}_${user.id}`;
      localStorage.removeItem(cacheKey);
      localStorage.removeItem(`${cacheKey}_time`);
    } catch (error) {
      console.error('Failed to add comment:', error);
    }
  };

  const handleAddReply = async (parentCommentId) => {
    if (!replyText.trim()) return;
    
    try {
      const token = localStorage.getItem('token');
      await axios.post(`/api/blogs/${selectedBlog.id}/comments`, {
        userId: user.id,
        content: replyText,
        parentCommentId
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setReplyText('');
      setReplyingTo(null);
      loadComments(selectedBlog.id);
      setBlogs(blogs.map(blog => 
        blog.id === selectedBlog.id ? { ...blog, comments_count: blog.comments_count + 1 } : blog
      ));
      
      const cacheKey = `blogs_${userRole}_${user.id}`;
      localStorage.removeItem(cacheKey);
      localStorage.removeItem(`${cacheKey}_time`);
    } catch (error) {
      console.error('Failed to add reply:', error);
    }
  };

  const handleDeleteComment = async (commentId) => {
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`/api/comments/${commentId}`, {
        data: { userId: user.id, userRole },
        headers: { Authorization: `Bearer ${token}` }
      });
      
      loadComments(selectedBlog.id);
      setBlogs(blogs.map(blog => 
        blog.id === selectedBlog.id ? { ...blog, comments_count: blog.comments_count - 1 } : blog
      ));
    } catch (error) {
      console.error('Failed to delete comment:', error);
    }
  };

  const openBlogModal = (blog) => {
    setSelectedBlog(blog);
    loadComments(blog.id);
  };

  const closeBlogModal = () => {
    setSelectedBlog(null);
    setComments([]);
    setNewComment('');
  };

  return (
    <div className="blog-section">
      <div className="blog-header">
        <h2>{userRole === 'mentor' ? 'My Blogs' : 'Latest Blogs'}</h2>
      </div>

      {loading ? (
        <div className="loading">Loading blogs...</div>
      ) : (
        <div className="blogs-grid">
          {blogs.map(blog => (
            <div key={blog.id} className="blog-card" onClick={() => openBlogModal(blog)}>
              {blog.images && blog.images.length > 0 && (
                <div className="blog-image">
                  <img src={blog.images[0]} alt={blog.title} />
                </div>
              )}
              <div className="blog-content">
                <h3>{blog.title}</h3>
                <p className="blog-description">{blog.description}</p>
                <div className="blog-meta">
                  <span className="blog-author">By {blog.mentor_name}</span>
                  <span className="blog-date">{new Date(blog.created_at).toLocaleDateString()}</span>
                </div>
                <div className="blog-stats">
                  <span>❤️ {blog.likes_count}</span>
                  <span>💬 {blog.comments_count}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedBlog && (
        <div className="blog-modal" onClick={closeBlogModal}>
          <div className="blog-modal-content" onClick={e => e.stopPropagation()}>
            <button className="close-btn" onClick={closeBlogModal}>×</button>
            
            <div className="blog-header-modal">
              <h2>{selectedBlog.title}</h2>
              <div className="blog-meta">
                <span>By {selectedBlog.mentor_name}</span>
                <span>{new Date(selectedBlog.created_at).toLocaleDateString()}</span>
              </div>
            </div>

            {selectedBlog.images && selectedBlog.images.length > 0 && (
              <div className="blog-images">
                {selectedBlog.images.map((img, index) => (
                  <img key={index} src={img} alt={`Blog ${index + 1}`} />
                ))}
              </div>
            )}

            <div className="blog-content-modal">
              <p>{selectedBlog.content}</p>
            </div>

            <div className="blog-actions">
              {userRole === 'mentee' && (
                <button 
                  className={`like-btn ${likedBlogs.includes(selectedBlog.id) ? 'liked' : ''}`}
                  onClick={() => handleLike(selectedBlog.id)}
                >
                  {likedBlogs.includes(selectedBlog.id) ? '❤️ Liked' : '🤍 Like'}
                </button>
              )}
            </div>

            <div className="comments-section">
              <h3>Comments</h3>
              
              <div className="add-comment">
                <textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Add a comment..."
                  rows="3"
                />
                <button onClick={handleAddComment} disabled={!newComment.trim()}>
                  Post Comment
                </button>
              </div>

              <div className="comments-list">
                {comments.map(comment => (
                  <div key={comment.id} className="comment">
                    <div className="comment-header">
                      <span className="comment-author">{comment.author_name}</span>
                      <span className="comment-date">{new Date(comment.created_at).toLocaleDateString()}</span>
                      {(comment.user_id === user.id || userRole === 'mentor') && (
                        <button 
                          className="delete-comment"
                          onClick={() => handleDeleteComment(comment.id)}
                        >
                          Delete
                        </button>
                      )}
                    </div>
                    <p className="comment-content">{comment.content}</p>
                    
                    <button 
                      className="reply-btn"
                      onClick={() => setReplyingTo(comment.id)}
                    >
                      Reply
                    </button>

                    {replyingTo === comment.id && (
                      <div className="reply-form">
                        <textarea
                          value={replyText}
                          onChange={(e) => setReplyText(e.target.value)}
                          placeholder="Write a reply..."
                          rows="2"
                        />
                        <div className="reply-actions">
                          <button onClick={() => handleAddReply(comment.id)}>
                            Post Reply
                          </button>
                          <button onClick={() => setReplyingTo(null)}>
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BlogSection;