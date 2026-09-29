import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  DatabaseOutlined,
  FileTextOutlined,
  SendOutlined,
  PictureOutlined,
  RobotOutlined,
} from "@ant-design/icons";
import { useQuery } from "@tanstack/react-query";
import { Alert, Button, Card, Col, Input, Row, Skeleton, Tag } from "antd";
import { useState } from "react";
import { getRagPreview, type RagPreviewProduct } from "../../api/rag/preview.api";

const currencyFormatter = new Intl.NumberFormat("vi-VN", {
  style: "currency",
  currency: "VND",
  maximumFractionDigits: 0,
});

function formatCurrency(value: number | null) {
  return value == null ? "Chưa có dữ liệu" : currencyFormatter.format(value);
}

function RagPreviewCard({ product }: { product: RagPreviewProduct }) {
  const [expanded, setExpanded] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);
  const image = product.primaryImage;

  return (
    <Card className="ai-preview-card">
      <div className="ai-preview-image">
        {image && !imageFailed ? (
          <img src={image.url} alt={image.alt || product.name} onError={() => setImageFailed(true)} />
        ) : (
          <span><PictureOutlined /> Chưa có ảnh</span>
        )}
      </div>
      <div className="ai-preview-card-body">
        <Tag className="ai-preview-brand">{product.brandName ?? "Chưa có thương hiệu"}</Tag>
        <h2>{product.name}</h2>
        <dl className="ai-preview-meta">
          <div><dt>Danh mục</dt><dd>{product.categoryName ?? "Chưa có dữ liệu"}</dd></div>
          <div><dt>Giá</dt><dd>{formatCurrency(product.effectivePrice)}</dd></div>
          <div><dt>Tồn kho</dt><dd>{product.totalStock}</dd></div>
        </dl>
        <Button
          icon={<FileTextOutlined />}
          onClick={() => setExpanded((current) => !current)}
          block
        >
          {expanded ? "Ẩn dữ liệu RAG" : "Xem dữ liệu RAG"}
        </Button>
        {expanded && <pre className="ai-preview-rag-text">{product.ragText}</pre>}
      </div>
    </Card>
  );
}

function RagPreviewSkeleton() {
  return (
    <Row gutter={[20, 20]}>
      {Array.from({ length: 3 }, (_, index) => (
        <Col xs={24} md={8} key={index}>
          <Card className="ai-preview-card"><Skeleton active paragraph={{ rows: 6 }} /></Card>
        </Col>
      ))}
    </Row>
  );
}

const suggestions = ["Vợt dưới 2 triệu", "Sản phẩm Yonex", "So sánh vợt cầu lông"];

export function AiAdvisorPreviewPage() {
  const [message, setMessage] = useState("");
  const [showInactiveNotice, setShowInactiveNotice] = useState(false);
  const previewQuery = useQuery({
    queryKey: ["rag", "preview"],
    queryFn: getRagPreview,
  });

  const showChatNotice = () => {
    setShowInactiveNotice(true);
  };

  return (
    <section className="ai-preview-page">
      <div className="store-container">
        <header className="ai-preview-hero">
          <Tag className="ocean-tag" icon={<RobotOutlined />}>AI Advisor Preview</Tag>
          <h1>Trợ lý tư vấn cầu lông AI</h1>
          <p>Hệ thống đang chuẩn bị dữ liệu sản phẩm cho RAG</p>
          <Tag className="ai-preview-status" icon={<DatabaseOutlined />}>RAG Data Connected</Tag>
        </header>

        <Card className="ai-chat-panel">
          <div className="ai-chat-header">
            <span className="ai-chat-avatar"><RobotOutlined /></span>
            <div>
              <h2>Trợ lý AI cầu lông</h2>
              <p>Hệ thống tư vấn sản phẩm bằng RAG đang được phát triển</p>
            </div>
            <Tag className="ai-chat-state">AI chưa kích hoạt</Tag>
          </div>

          <div className="ai-chat-message">
            <span className="ai-chat-message-avatar"><RobotOutlined /></span>
            <p>
              Xin chào! Mình là trợ lý tư vấn cầu lông.<br />
              Hiện hệ thống đã kết nối và chuẩn hóa dữ liệu sản phẩm.<br />
              Chức năng tư vấn AI sẽ được kích hoạt ở bước tiếp theo.
            </p>
          </div>

          {showInactiveNotice && (
            <Alert
              className="ai-chat-notice"
              type="info"
              showIcon
              message="AI Chatbot chưa được kích hoạt. Hiện hệ thống đang ở giai đoạn chuẩn bị dữ liệu RAG."
            />
          )}

          <div className="ai-chat-input-row">
            <Input
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              onPressEnter={showChatNotice}
              placeholder="Ví dụ: Tôi muốn tìm vợt Yonex dưới 2 triệu..."
            />
            <Button type="primary" icon={<SendOutlined />} onClick={showChatNotice}>
              Gửi
            </Button>
          </div>

          <div className="ai-chat-suggestions" aria-label="Gợi ý câu hỏi">
            {suggestions.map((suggestion) => (
              <button type="button" key={suggestion} onClick={() => setMessage(suggestion)}>
                {suggestion}
              </button>
            ))}
          </div>
        </Card>

        {previewQuery.isError && (
          <Alert
            className="ai-preview-alert"
            type="error"
            showIcon
            message="Không thể tải dữ liệu RAG preview"
            description="Hãy kiểm tra backend rồi thử lại."
            action={<Button size="small" onClick={() => previewQuery.refetch()}>Thử lại</Button>}
          />
        )}

        {previewQuery.isPending ? (
          <RagPreviewSkeleton />
        ) : previewQuery.data ? (
          <Row gutter={[20, 20]}>
            {previewQuery.data.products.map((product) => (
              <Col xs={24} md={8} key={product.id}>
                <RagPreviewCard product={product} />
              </Col>
            ))}
          </Row>
        ) : null}

        <Card className="ai-progress-card" title="Tiến độ RAG">
          <ul>
            <li className="done"><CheckCircleOutlined /> Kết nối dữ liệu sản phẩm</li>
            <li className="done"><CheckCircleOutlined /> Chuẩn hóa dữ liệu</li>
            <li className="done"><CheckCircleOutlined /> Tạo RAG text</li>
            <li><ClockCircleOutlined /> Embedding</li>
            <li><ClockCircleOutlined /> Vector Search</li>
            <li><ClockCircleOutlined /> AI Chatbot</li>
          </ul>
        </Card>
      </div>
    </section>
  );
}
