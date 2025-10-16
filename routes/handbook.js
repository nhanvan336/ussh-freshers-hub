const express = require('express');
const router = express.Router();
const { asyncHandler } = require('../middleware/error');
const { isAuthenticated, optionalAuth, isAdmin } = require('../middleware/auth');
const { validateEvent, validateObjectId } = require('../middleware/validation');
const Event = require('../models/Event');
const User = require('../models/User');

// University Handbook main page
router.get('/', optionalAuth, asyncHandler(async (req, res) => {
  try {
    const upcomingEvents = await Event.find({
      startDate: { $gte: new Date() },
      status: 'published',
      isPublic: true
    })
      .sort({ startDate: 1 })
      .limit(5);
    
    const featuredEvents = await Event.find({
      isFeatured: true,
      status: 'published',
      isPublic: true
    })
      .sort({ startDate: 1 })
      .limit(3);
    
    const sections = [
      {
        id: 'map',
        title: 'Bản đồ',
        description: 'Sơ đồ tương tác khuôn viên trường',
        icon: 'fas fa-map-marked-alt',
        url: '/handbook/campus-map'
      },
      {
        id: 'contacts',
        title: 'Danh bạ phòng ban',
        description: 'Thông tin liên hệ các phòng ban',
        icon: 'fas fa-address-book',
        url: '/handbook/contacts'
      },
      {
        id: 'calendar',
        title: 'Lịch năm học',
        description: 'Lịch học tập và sự kiện quan trọng',
        icon: 'fas fa-calendar-alt',
        url: '/handbook/academic-calendar'
      },
      {
        id: 'library',
        title: 'Hướng dẫn thư viện',
        description: 'Cách sử dụng thư viện hiệu quả',
        icon: 'fas fa-book',
        url: '/handbook/library-guide'
      },
      {
        id: 'clubs',
        title: 'Câu lạc bộ & Đoàn thể',
        description: 'Danh sách các CLB và hoạt động ngoại khóa',
        icon: 'fas fa-users',
        url: '/handbook/clubs'
      },
      {
        id: 'policies',
        title: 'Quy định & Chính sách',
        description: 'Các quy định quan trọng của trường',
        icon: 'fas fa-file-contract',
        url: '/handbook/policies'
      }
    ];
    
    res.render('pages/handbook/index', {
      title: 'Cẩm nang Đại học - USSH Freshers\' Hub',
      upcomingEvents,
      featuredEvents,
      sections,
      user: req.user
    });
  } catch (error) {
    console.error('Handbook page error:', error);
    res.render('pages/handbook/index', {
      title: 'Cẩm nang Đại học - USSH Freshers\' Hub',
      upcomingEvents: [],
      featuredEvents: [],
      sections: [],
      error: 'Có lỗi xảy ra khi tải thông tin cẩm nang',
      user: req.user
    });
  }
}));

// Campus Map
router.get('/campus-map', (req, res) => {
  const locations = [
    {
      id: 'building-a',
      name: 'Tòa nhà A',
      description: 'Phòng hành chính, đào tạo khoa'
    },
    {
      id: 'building-b',
      name: 'Tòa nhà B',
      description: 'Phòng hành chính, đào tạo khoa'
    },
    {
      id: 'building-c',
      name: 'Tòa nhà C',
      description: 'Phòng hành chính, đào tạo khoa'
    },
    {
      id: 'building-bc',
      name: 'Tòa nhà B-C',
      description: 'Giảng đường'
    },
    {
      id: 'building-g',
      name: 'Tòa nhà G',
      description: 'Giảng đường'
    },
    {
      id: 'building-i',
      name: 'Tòa nhà I',
      description: 'Giảng đường'
    },
    {
      id: 'building-e',
      name: 'Tòa nhà E',
      description: 'Khu hiệu bộ'
    },
    {
      id: 'building-h',
      name: 'Tòa nhà H',
      description: 'Viện Đào tạo Báo chí và Truyền thông'
    }
  ];
  
  res.render('pages/handbook/campus-map', {
    title: "Bản đồ - USSH Freshers' Hub",
    locations,
    user: req.user
  });
});

// Department Contacts
router.get('/contacts', (req, res) => {
  const departmentsData = [
    {
      groupName: 'I. Phòng Đào tạo và Công tác người học',
      departments: [
        {
          name: '1. Bộ phận Tuyển sinh',
          sections: [
            {
              title: 'Tuyển sinh đại học chính quy, tuyển sinh THPT chuyên:',
              location: 'Phòng 101 nhà C',
              phone: ['(024) 385 83957', '086 2155299'],
              email: ['tuyensinh@ussh.edu.vn']
            },
            {
              title: 'Tuyển sinh sau đại học, vừa làm vừa học:',
              location: 'Phòng 102 nhà C',
              phone: ['(024) 355 88053', '039 2628299'],
              email: ['tuyensinhsdh@ussh.edu.vn', 'daotaovlvh@ussh.edu.vn']
            }
          ]
        },
        {
          name: '2. Bộ phận Đào tạo chính quy',
          location: 'Phòng 103 nhà E',
          phone: ['(024) 355 75892', '(024) 385 85237'],
          email: ['phongdaotao@sv.ussh.edu.vn']
        },
        {
          name: '3. Bộ phận Đào tạo Thạc sĩ',
          location: 'Phòng 105 nhà E',
          email: ['daotaosdh@ussh.edu.vn']
        },
        {
          name: '4. Bộ phận Đào tạo Tiến sĩ, Chương trình đào tạo, Truyền thông',
          location: 'Phòng 101 nhà E',
          phone: ['(024) 38585239'],
          email: [
            'Bộ phận Đào tạo tiến sĩ: tanltk@vnu.edu.vn',
            'Bộ phận Chương trình đào tạo: chuongtrinhdaotao@ussh.edu.vn',
            'Bộ phận Truyền thông: ccit@ussh.edu.vn'
          ]
        },
        {
          name: '5. Bộ phận Công tác người học',
          location: 'Phòng 102, nhà E',
          phone: ['(024) 35576371', '(024) 38583800', '(024) 38585242'],
          email: ['ctsv@sv.ussh.edu.vn']
        }
      ]
    },
    {
      groupName: 'II. Phòng Khoa học, Đối ngoại và Tạp chí',
      departments: [
        {
          name: '1. Bộ phận Quản lý Nghiên cứu khoa học',
          location: 'Phòng 608, 610 nhà E',
          phone: ['(024) 38588342', '(024) 38584278'],
          email: ['phongkhoahoc@ussh.edu.vn']
        },
        {
          name: '2. Bộ phận Đối ngoại',
          location: 'Phòng 611 nhà E',
          phone: ['(024) 335851282'],
          email: ['ico@ussh.edu.vn']
        },
        {
          name: '3. Tạp chí Khoa học Xã hội và Nhân văn',
          location: 'Phòng 604 và 606 nhà E',
          phone: ['(024).3558.1984'],
          email: ['tckhxhnv@ussh.edu.vn', 'jossh@ussh.edu.vn', 'tckhxhnv@vnu.edu.vn'],
          website: 'https://jossh.ussh.edu.vn/'
        }
      ]
    },
    {
      groupName: 'III. Phòng Thanh tra, Pháp chế và Đảm bảo chất lượng',
      location: 'Phòng 404, 406, 408, nhà E',
      departments: [
        { name: 'Bộ phận Thanh tra – Pháp chế', phone: ['(024) 385 85241'], email: ['thanhtraphapche@ussh.edu.vn'] },
        { name: 'Bộ phận Đảm bảo Chất lượng', phone: ['(024) 35574515', '(024) 355 88051'], email: ['dbcl@ussh.edu.vn'] },
        { name: 'Lãnh đạo phòng', phone: ['(024) 355 80805'] }
      ]
    },
    {
      groupName: 'IV. Phòng Tổ chức cán bộ',
      location: 'Phòng 602, 603, nhà E',
      phone: ['(024) 38585246'],
      email: ['tccb.xhnv@gmail.com']
    },
    {
      groupName: 'V. Phòng Hành chính - Tổng hợp',
      location: 'Phòng 401, 105 nhà E',
      phone: ['(024) 38583799'],
      email: ['hcth.xhnv@gmail.com']
    },
    {
      groupName: 'VI. Phòng Kế hoạch - Tài chính',
      location: 'Phòng 405, 407, 410 nhà E',
      phone: ['(024)355 76122', '(024) 355 81927'],
      email: ['kehoachtaichinh.ussh@gmail.com']
    }
  ];
  
  res.render('pages/handbook/contacts', {
    title: 'Danh bạ phòng ban - USSH Freshers\' Hub',
    departmentsData,
    user: req.user
  });
});

// Academic Calendar
router.get('/academic-calendar', (req, res) => {
  const calendarData = {
    lastUpdated: new Date().toLocaleString('vi-VN', { dateStyle: 'full', timeStyle: 'short' }),
    imageUrl: '/images/academic-calendar.png'
  };
  res.render('pages/handbook/academic-calendar', {
    title: 'Lịch năm học - USSH Freshers\' Hub',
    calendarData,
    user: req.user
  });
});

// Library Guide
router.get('/library-guide', (req, res) => {
  const libraryInfo = {
    hours: {
      weekdays: '7:30 - 21:30',
      weekends: '8:00 - 17:00'
    },
    floors: [
      {
        floor: 'Tầng 1',
        sections: ['Quầy tiếp nhận', 'Sách giáo trình', 'Báo chí tạp chí']
      },
      {
        floor: 'Tầng 2',
        sections: ['Sách chuyên ngành', 'Phòng đọc riêng', 'Khu vực đọc sách']
      },
      {
        floor: 'Tầng 3',
        sections: ['Tài liệu tham khảo', 'Phòng học nhóm', 'Khu vực máy tính']
      }
    ],
    services: [
      'Mượn sách (tối đa 5 cuốn/15 ngày)',
      'Tìm kiếm tài liệu trực tuyến',
      'In ấn, photocopy',
      'Truy cập cơ sở dữ liệu',
      'Hỗ trợ nghiên cứu'
    ],
    rules: [
      'Xuất trình thẻ sinh viên khi vào thư viện',
      'Giữ yên lặng trong khu vực đọc sách',
      'Không mang thức ăn vào thư viện',
      'Tắt tiếng điện thoại hoặc để chế độ rùng',
      'Trả sách đúng hạn để tránh phạt'
    ]
  };
  
  res.render('pages/handbook/library-guide', {
    title: 'Hướng dẫn thư viện - USSH Freshers\' Hub',
    libraryInfo,
    user: req.user
  });
});

// Clubs and Organizations - ĐÃ SỬA LẠI
router.get('/clubs', (req, res) => {
  res.render('pages/handbook/clubs', {
    title: 'Câu lạc bộ & Đoàn thể - USSH Freshers\' Hub',
    imageUrl: '/images/club-diagram.png', // Truyền đường dẫn ảnh sang view
    user: req.user
  });
});

// Policies and Regulations
router.get('/policies', (req, res) => {
  const policies = [
    {
      title: 'Quy chế đào tạo',
      description: 'Các quy định về học tập, thi cử, đánh giá',
      sections: [
        'Điều kiện tốt nghiệp',
        'Quy định về điểm số',
        'Thủ tục xin nghỉ học',
        'Xử lý vi phạm học tập'
      ]
    },
    {
      title: 'Quy định nội trú',
      description: 'Các quy định dành cho sinh viên ở ký túc xá',
      sections: [
        'Giờ ra vào ký túc xá',
        'Quy định về vệ sinh',
        'Sử dụng thiết bị chung',
        'Xử lý vi phạm'
      ]
    },
    {
      title: 'Quy định về học bổng',
      description: 'Tiêu chí và thủ tục xin học bổng',
      sections: [
        'Học bổng học tập giỏi',
        'Học bổng khó khăn',
        'Học bổng tài trợ',
        'Thủ tục nộp hồ sơ'
      ]
    },
    {
      title: 'Quy định sử dụng thư viện',
      description: 'Hướng dẫn sử dụng dịch vụ thư viện',
      sections: [
        'Thủ tục mượn sách',
        'Sử dụng phòng đọc',
        'Truy cập tài nguyên số',
        'Quy định phạt'
      ]
    }
  ];
  
  res.render('pages/handbook/policies', {
    title: 'Quy định & Chính sách - USSH Freshers\' Hub',
    policies,
    user: req.user
  });
});

// View event details
router.get('/event/:id', optionalAuth, validateObjectId('id'), asyncHandler(async (req, res) => {
  try {
    const event = await Event.findById(req.params.id)
      .populate('createdBy', 'username fullName')
      .populate('participants.user', 'username fullName');
    
    if (!event || event.status !== 'published' || !event.isPublic) {
      return res.status(404).render('pages/404', {
        title: 'Không tìm thấy sự kiện - USSH Freshers\' Hub',
        user: req.user
      });
    }
    
    const relatedEvents = await Event.find({
      _id: { $ne: event._id },
      $or: [
        { category: event.category },
        { tags: { $in: event.tags } }
      ],
      status: 'published',
      isPublic: true
    }).sort({ startDate: 1 }).limit(3);
    
    res.render('pages/handbook/event', {
      title: `${event.title} - USSH Freshers\' Hub`,
      event,
      relatedEvents,
      user: req.user
    });
  } catch (error) {
    console.error('Event view error:', error);
    res.status(500).render('pages/error', {
      title: 'Lỗi - USSH Freshers\' Hub',
      message: 'Có lỗi xảy ra khi tải thông tin sự kiện',
      user: req.user
    });
  }
}));

// Register for event
router.post('/event/:id/register', isAuthenticated, validateObjectId('id'), asyncHandler(async (req, res) => {
    try {
      const event = await Event.findById(req.params.id);
      
      if (!event || event.status !== 'published' || !event.isPublic) {
        return res.status(404).json({ success: false, message: 'Sự kiện không tồn tại' });
      }
      
      if (!event.registrationRequired) {
        return res.status(400).json({ success: false, message: 'Sự kiện này không yêu cầu đăng ký' });
      }
      
      try {
        event.registerUser(req.user._id);
        await event.save();
        res.json({ success: true, message: 'Đăng ký tham gia sự kiện thành công!' });
      } catch (registrationError) {
        res.status(400).json({ success: false, message: registrationError.message });
      }
    } catch (error) {
      console.error('Event registration error:', error);
      res.status(500).json({ success: false, message: 'Có lỗi xảy ra khi đăng ký sự kiện' });
    }
}));

// Unregister from event
router.post('/event/:id/unregister', isAuthenticated, validateObjectId('id'), asyncHandler(async (req, res) => {
    try {
      const event = await Event.findById(req.params.id);
      
      if (!event) {
        return res.status(404).json({ success: false, message: 'Sự kiện không tồn tại' });
      }
      
      try {
        event.unregisterUser(req.user._id);
        await event.save();
        res.json({ success: true, message: 'Hủy đăng ký thành công' });
      } catch (unregistrationError) {
        res.status(400).json({ success: false, message: unregistrationError.message });
      }
    } catch (error) {
      console.error('Event unregistration error:', error);
      res.status(500).json({ success: false, message: 'Có lỗi xảy ra khi hủy đăng ký' });
    }
}));

module.exports = router;
